import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Paper,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import RequestQuoteRoundedIcon from "@mui/icons-material/RequestQuoteRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import FolderOpenRoundedIcon from "@mui/icons-material/FolderOpenRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import PendingOutlinedIcon from "@mui/icons-material/PendingOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import ShareRoundedIcon from "@mui/icons-material/ShareRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import IosShareRoundedIcon from "@mui/icons-material/IosShareRounded";
import { saveAs } from "file-saver";

import { apiService } from "../../api/service";
import { useDialogStore } from "../../store/useDialogStore";
import { formatDate } from "../../utils/dateFormatter";
import { generateInvoicePdf } from "../../utils/generateInvoicePdf";
import { shareToWhatsAppAfter } from "../../utils/shareToWhatsApp";
import AsyncSearchSelect from "../../ui/AsyncSearchSelect";
import DateTimePicker from "../../ui/DateTimePicker";
import PillRadioGroup from "../../common/components/PillRadioGroup";
import { PRIORITY_OPTIONS, CLIENT_STATUS_OPTIONS } from "../../common/components/pillRadioOptions";
import {
  InvoiceHeader,
  InvoiceMetaPanel,
  InvoicePanelLabel,
  InvoiceTotalCard,
  InvoiceFooter,
} from "../components/InvoiceDocument";

interface QuotationItem {
  id: number;
  description: string | null;
  width: number;
  height: number;
  unit: "ft" | "in";
  sq_ft: number;
  rate: number;
  pieces: number;
  total: number;
  is_manual_total: boolean;
}

interface QuotationDetail {
  id: number;
  quotation_number: string;
  project_type: string;
  subtotal: number;
  discount_amount: number;
  amount: number;
  status: "pending" | "accepted" | "rejected" | "converted";
  valid_until: string | null;
  created_at: string;
  converted_project_id: number | null;
  converted_invoice_id: number | null;
  customer: {
    first_name: string;
    last_name: string;
    contact_number: string;
    email: string | null;
  } | null;
  items: QuotationItem[];
}

interface EmployeeOption {
  username: string;
}

const STATUS_CONFIG: Record<
  string,
  { bg: string; color: string; border: string; label: string; icon: React.ReactElement }
> = {
  pending: {
    bg: "var(--amber-100)",
    color: "var(--amber-800)",
    border: "var(--amber-300)",
    label: "Awaiting Response",
    icon: <PendingOutlinedIcon sx={{ fontSize: "0.9rem !important" }} />,
  },
  accepted: {
    bg: "var(--blue-100)",
    color: "var(--blue-800)",
    border: "var(--blue-300)",
    label: "Accepted",
    icon: <CheckCircleOutlineRoundedIcon sx={{ fontSize: "0.9rem !important" }} />,
  },
  rejected: {
    bg: "var(--red-100)",
    color: "var(--red-800)",
    border: "var(--red-300)",
    label: "Rejected",
    icon: <CancelOutlinedIcon sx={{ fontSize: "0.9rem !important" }} />,
  },
  converted: {
    bg: "var(--green-100)",
    color: "var(--green-800)",
    border: "var(--green-300)",
    label: "Converted to Invoice",
    icon: <CheckCircleOutlineRoundedIcon sx={{ fontSize: "0.9rem !important" }} />,
  },
};

const formatCurrency = (val: number) =>
  `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Feet uses the ' mark, inches uses " - whichever the line was actually
// measured in (see GenerateQuotation.tsx's per-row unit toggle).
const formatDimension = (value: number, unit: "ft" | "in") => `${value}${unit === "in" ? '"' : "'"}`;

export default function QuotationView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { openDialog } = useDialogStore();
  const [quotation, setQuotation] = useState<QuotationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<"download" | "share" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [shareMenuAnchor, setShareMenuAnchor] = useState<HTMLElement | null>(null);
  const canShare = typeof navigator !== "undefined" && !!navigator.share;

  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Convert-to-invoice mini-step - the only project-level details a
  // quotation never asked for (who does the work, when), collected only
  // once the customer has actually accepted. Everything else (customer,
  // job type, line items, discount) already lives on the quotation and
  // carries straight over server-side (see
  // app/quotations/repository.py's convert_quotation_to_invoice).
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertAssignedTo, setConvertAssignedTo] = useState<string | undefined>(undefined);
  const [convertStartDate, setConvertStartDate] = useState<string | null>(new Date().toISOString());
  const [convertDeliveryDate, setConvertDeliveryDate] = useState<string | null>(new Date().toISOString());
  const [convertPriority, setConvertPriority] = useState<"Normal" | "High" | "Urgent">("Normal");
  const [convertClientStatus, setConvertClientStatus] = useState<"Confirmed" | "Correction">("Confirmed");
  const [convertError, setConvertError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);

  const load = () => {
    setLoading(true);
    apiService
      .get<QuotationDetail>(`/quotations/${id}/details`)
      .then((data) => setQuotation(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleBack = () => {
    const canGoBack = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (canGoBack > 0) navigate(-1);
    else navigate("/admin/dashboard");
  };

  // The "pdf-exporting" class (see the print stylesheet below) strips the
  // on-screen card's border/shadow/rounded corners first - see
  // InvoiceView.tsx's identical buildPdfFile for the full reasoning.
  const buildPdfFile = async () => {
    if (!sheetRef.current || !quotation) return null;
    const node = sheetRef.current;
    node.classList.add("pdf-exporting");
    try {
      return await generateInvoicePdf(node, `Quotation-${quotation.quotation_number}.pdf`);
    } finally {
      node.classList.remove("pdf-exporting");
    }
  };

  const handleDownload = async () => {
    setExportError(null);
    setExporting("download");
    try {
      const file = await buildPdfFile();
      if (file) saveAs(file, file.name);
    } catch (err) {
      console.error("Failed to generate quotation PDF", err);
      setExportError("Couldn't generate the PDF. Please try again.");
    } finally {
      setExporting(null);
    }
  };

  const handleShareNative = async () => {
    setExportError(null);
    setExporting("share");
    try {
      const file = await buildPdfFile();
      if (!file || !quotation) return;
      const shareData = {
        files: [file],
        title: `Quotation ${quotation.quotation_number}`,
        text: `Quotation ${quotation.quotation_number} - ${formatCurrency(quotation.amount)}`,
      };
      if (navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else if (navigator.share) {
        await navigator.share({ title: shareData.title, text: shareData.text });
      }
    } catch (err) {
      if ((err as DOMException)?.name !== "AbortError") {
        console.error("Failed to share quotation", err);
        setExportError("Couldn't share the quotation. Please try again.");
      }
    } finally {
      setExporting(null);
    }
  };

  // See InvoiceView.tsx's matching handleShareWhatsApp for why this is a
  // separate path from handleShareNative - desktop WhatsApp typically
  // isn't registered as an OS share target, so it never appears in that
  // native share sheet no matter how the button is clicked. wa.me can
  // only pre-fill text, never attach a file, so this uploads the same PDF
  // buildPdfFile() renders to app/shared_documents and shares the public
  // link it hands back, via shareToWhatsAppAfter (see
  // utils/shareToWhatsApp.ts - needed because opening the wa.me window
  // only after that upload finishes would get it silently popup-blocked).
  const handleShareWhatsApp = async () => {
    if (!quotation) return;
    setExportError(null);
    setExporting("share");
    try {
      await shareToWhatsAppAfter(async () => {
        const file = await buildPdfFile();
        if (!file) throw new Error("Failed to generate the quotation PDF");
        const formData = new FormData();
        formData.append("file", file, file.name);
        const { url } = await apiService.post<{ url: string }>(
          `/quotations/${quotation.id}/share-link`,
          formData,
        );
        return `Quotation ${quotation.quotation_number} - ${formatCurrency(quotation.amount)}\n${url}`;
      });
    } catch (err) {
      console.error("Failed to share quotation link to WhatsApp", err);
      setExportError("Couldn't prepare the quotation link. Please try again.");
    } finally {
      setExporting(null);
    }
  };

  const updateStatus = async (status: "accepted" | "rejected") => {
    setStatusError(null);
    setStatusUpdating(true);
    try {
      await apiService.patch(`/quotations/${id}/status`, { status });
      load();
    } catch (err) {
      console.error("Failed to update quotation status", err);
      setStatusError("Couldn't update the quotation's status. Please try again.");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleConvert = async () => {
    setConvertError(null);
    if (!convertAssignedTo || !convertStartDate || !convertDeliveryDate) {
      setConvertError("Pick an assignee and both dates before converting.");
      return;
    }
    if (new Date(convertDeliveryDate) < new Date(convertStartDate)) {
      setConvertError("Delivery date can't be before the start date.");
      return;
    }
    setConverting(true);
    try {
      const invoice = await apiService.post<{ id: number }>(`/quotations/${id}/convert`, {
        assigned_to: convertAssignedTo,
        priority: convertPriority,
        client_status: convertClientStatus,
        start_date: convertStartDate,
        delivery_date: convertDeliveryDate,
      });
      setConvertOpen(false);
      // Now that "View Invoice" is a dialog (see admin/pages/InvoiceView.tsx)
      // rather than a navigation away, this page stays put underneath it -
      // reload so it reflects the quotation's new "converted" status
      // (Convert button gone, etc.) once the invoice dialog is closed,
      // instead of showing stale pre-conversion state.
      load();
      openDialog("viewInvoice", invoice.id, "view");
    } catch (err) {
      console.error("Failed to convert quotation", err);
      setConvertError("Couldn't convert this quotation to an invoice. Please try again.");
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
        <CircularProgress size={36} thickness={4} />
        <Typography variant="body2" color="text.secondary">
          Preparing document...
        </Typography>
      </Box>
    );
  }

  if (error || !quotation) {
    return (
      <Box sx={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Paper elevation={0} sx={{ p: 5, textAlign: "center", maxWidth: 420, border: "1px dashed var(--slate-300)", borderRadius: 3 }}>
          <RequestQuoteRoundedIcon sx={{ fontSize: 48, color: "var(--slate-400)", mb: 1.5 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: "var(--slate-700)" }}>
            Quotation Not Found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
            The requested quotation could not be located or may have been deleted.
          </Typography>
          <Button
            variant="contained"
            disableElevation
            startIcon={<ArrowBackRoundedIcon />}
            onClick={() => navigate("/admin/dashboard")}
            sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
          >
            Return to Dashboard
          </Button>
        </Paper>
      </Box>
    );
  }

  const status = STATUS_CONFIG[quotation.status] ?? STATUS_CONFIG.pending;
  const customerName = quotation.customer
    ? `${quotation.customer.first_name} ${quotation.customer.last_name}`
    : "—";
  const isExpired =
    quotation.status === "pending" &&
    !!quotation.valid_until &&
    new Date(quotation.valid_until) < new Date();

  return (
    <Box sx={{ bgcolor: "var(--slate-50)", minHeight: "100vh", pb: 2 }}>
      {/* Non-Printable Sticky Toolbar */}
      <Box
        className="invoice-toolbar"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          backdropFilter: "blur(8px)",
          bgcolor: "rgba(248, 250, 252, 0.85)",
          borderBottom: "1px solid var(--slate-200)",
          py: 1,
          mb: 1.5,
        }}
      >
        <Box sx={{ maxWidth: 840, mx: "auto", px: { xs: 2, sm: 3 }, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Button
            startIcon={<ArrowBackRoundedIcon />}
            onClick={handleBack}
            sx={{ color: "var(--slate-600)", textTransform: "none", fontWeight: 600, "&:hover": { bgcolor: "var(--slate-200)" } }}
          >
            Back
          </Button>

          <Stack direction="row" spacing={1}>
            <Tooltip title="Download as PDF">
              <span>
                <IconButton
                  onClick={handleDownload}
                  disabled={exporting !== null}
                  sx={{ border: "1px solid var(--slate-200)", borderRadius: 2, color: "var(--slate-700)", "&:hover": { bgcolor: "var(--slate-100)" } }}
                >
                  {exporting === "download" ? <CircularProgress size={20} thickness={5} /> : <FileDownloadRoundedIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Share">
              <span>
                <IconButton
                  onClick={(e) => setShareMenuAnchor(e.currentTarget)}
                  disabled={exporting !== null}
                  sx={{ border: "1px solid var(--slate-200)", borderRadius: 2, color: "var(--slate-700)", "&:hover": { bgcolor: "var(--slate-100)" } }}
                >
                  {exporting === "share" ? <CircularProgress size={20} thickness={5} /> : <ShareRoundedIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
            <Menu
              anchorEl={shareMenuAnchor}
              open={!!shareMenuAnchor}
              onClose={() => setShareMenuAnchor(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              <MenuItem
                onClick={() => {
                  setShareMenuAnchor(null);
                  handleShareWhatsApp();
                }}
              >
                <ListItemIcon>
                  <WhatsAppIcon fontSize="small" sx={{ color: "#25D366" }} />
                </ListItemIcon>
                <ListItemText>Share to WhatsApp</ListItemText>
              </MenuItem>
              {canShare && (
                <MenuItem
                  onClick={() => {
                    setShareMenuAnchor(null);
                    handleShareNative();
                  }}
                >
                  <ListItemIcon>
                    <IosShareRoundedIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Share via...</ListItemText>
                </MenuItem>
              )}
            </Menu>

            <Button
              variant="contained"
              disableElevation
              startIcon={<PrintRoundedIcon />}
              onClick={() => window.print()}
              sx={{ bgcolor: "var(--slate-900)", color: "var(--white)", textTransform: "none", fontWeight: 600, borderRadius: 2, px: 2.5, "&:hover": { bgcolor: "var(--slate-800)" } }}
            >
              Print
            </Button>
          </Stack>
        </Box>
        {exportError && (
          <Box sx={{ maxWidth: 840, mx: "auto", px: { xs: 2, sm: 3 }, pt: 1 }}>
            <Typography variant="caption" sx={{ color: "var(--red-600)", fontWeight: 600 }}>
              {exportError}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Action Bar - the customer's decision, and what to do about it */}
      <Box className="invoice-toolbar" sx={{ maxWidth: 840, mx: "auto", px: { xs: 2, sm: 3 }, mb: 1.5 }}>
        {statusError && (
          <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2 }}>
            {statusError}
          </Alert>
        )}
        {isExpired && (
          <Alert severity="warning" sx={{ mb: 1.5, borderRadius: 2 }}>
            This quotation's valid-until date has passed - confirm with the customer before accepting it.
          </Alert>
        )}
        {quotation.status === "pending" && (
          <Stack direction="row" spacing={1.5} justifyContent="flex-end">
            <Button
              variant="outlined"
              color="error"
              disabled={statusUpdating}
              onClick={() => updateStatus("rejected")}
              sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
            >
              Mark Rejected
            </Button>
            <Button
              variant="contained"
              disableElevation
              disabled={statusUpdating}
              onClick={() => updateStatus("accepted")}
              sx={{ bgcolor: "var(--blue-600)", textTransform: "none", fontWeight: 600, borderRadius: 2, "&:hover": { bgcolor: "var(--blue-700)" } }}
            >
              Mark Accepted
            </Button>
          </Stack>
        )}
        {quotation.status === "accepted" && (
          <Stack direction="row" justifyContent="flex-end">
            <Button
              variant="contained"
              disableElevation
              startIcon={<ReceiptLongRoundedIcon />}
              onClick={() => setConvertOpen(true)}
              sx={{ bgcolor: "var(--green-600)", textTransform: "none", fontWeight: 700, borderRadius: 2, "&:hover": { bgcolor: "var(--green-700)" } }}
            >
              Convert to Invoice
            </Button>
          </Stack>
        )}
        {quotation.status === "converted" && quotation.converted_invoice_id && (
          <Stack direction="row" justifyContent="flex-end">
            <Button
              variant="outlined"
              startIcon={<ReceiptLongRoundedIcon />}
              onClick={() => openDialog("viewInvoice", quotation.converted_invoice_id, "view")}
              sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
            >
              View Invoice
            </Button>
          </Stack>
        )}
      </Box>

      {/* Printable Quotation Sheet */}
      <Paper
        ref={sheetRef}
        className="invoice-sheet"
        elevation={0}
        sx={{ maxWidth: 840, mx: "auto", bgcolor: "var(--white)", borderRadius: 3, border: "1px solid var(--slate-200)", boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.05)", p: { xs: 2.5, sm: 3.5 } }}
      >
        <InvoiceHeader invoiceNumber={quotation.quotation_number} documentLabel="QUOTATION" />

        <InvoiceMetaPanel>
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Box sx={{ p: 1, bgcolor: "var(--slate-100)", borderRadius: 1.5, color: "var(--slate-600)", height: "fit-content" }}>
              <PersonRoundedIcon fontSize="small" />
            </Box>
            <Box>
              <InvoicePanelLabel>Quoted To</InvoicePanelLabel>
              <Typography sx={{ fontWeight: 700, color: "var(--slate-900)", fontSize: "1.05rem", mt: 0.2 }}>
                {customerName}
              </Typography>
              {quotation.customer && (
                <Stack spacing={0.2} sx={{ mt: 0.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.85rem" }}>
                    {quotation.customer.email}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.85rem" }}>
                    {quotation.customer.contact_number}
                  </Typography>
                </Stack>
              )}
            </Box>
          </Box>

          <Box sx={{ textAlign: { xs: "left", sm: "right" }, mt: { xs: 2, sm: 0 } }}>
            <Stack spacing={0.5} alignItems={{ xs: "flex-start", sm: "flex-end" }}>
              <Box sx={{ display: "flex", justifyContent: { sm: "flex-end" }, gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Quotation Date:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--slate-700)" }}>
                  {formatDate(quotation.created_at)}
                </Typography>
              </Box>
              {quotation.valid_until && (
                <Box sx={{ display: "flex", justifyContent: { sm: "flex-end" }, gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Valid Until:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--slate-700)" }}>
                    {formatDate(quotation.valid_until)}
                  </Typography>
                </Box>
              )}
              <Box sx={{ pt: 0.5 }}>
                <Chip
                  icon={status.icon}
                  label={status.label}
                  size="small"
                  sx={{ bgcolor: status.bg, color: status.color, border: `1px solid ${status.border}`, fontWeight: 700, fontSize: "0.75rem", letterSpacing: "0.02em", "& .MuiChip-icon": { color: status.color } }}
                />
              </Box>
            </Stack>
          </Box>
        </InvoiceMetaPanel>

        {quotation.project_type && (
          <Box sx={{ mb: 1.5, p: 1.25, borderRadius: 2, bgcolor: "var(--slate-50)", border: "1px solid var(--slate-200)", display: "flex", alignItems: "flex-start", gap: 1.5 }}>
            <FolderOpenRoundedIcon sx={{ color: "var(--slate-500)", mt: 0.2 }} fontSize="small" />
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--slate-900)" }}>
                {quotation.project_type} Order
              </Typography>
            </Box>
          </Box>
        )}

        <Box sx={{ border: "1px solid var(--slate-200)", borderRadius: 2.5, overflow: "hidden", mb: 1.5 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "28px 2.2fr 1.1fr 0.6fr 1fr 1.2fr", bgcolor: "var(--slate-50)", borderBottom: "1px solid var(--slate-200)", px: 2, py: 0.75, gap: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "var(--slate-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>#</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "var(--slate-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Item Description</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "var(--slate-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Size / Area</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, textAlign: "right", color: "var(--slate-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Pieces</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "var(--slate-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Rate (₹)</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, textAlign: "right", color: "var(--slate-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Amount</Typography>
          </Box>

          {quotation.items.map((item, idx) => (
            <Box
              key={item.id}
              className="invoice-row"
              sx={{ display: "grid", gridTemplateColumns: "28px 2.2fr 1.1fr 0.6fr 1fr 1.2fr", px: 2, py: 0.9, gap: 1.5, alignItems: "center", borderTop: idx === 0 ? "none" : "1px solid var(--slate-100)", bgcolor: idx % 2 === 0 ? "var(--white)" : "var(--slate-50)" }}
            >
              <Typography variant="body2" sx={{ color: "var(--slate-400)", fontWeight: 600 }}>{idx + 1}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--slate-800)" }}>{item.description || "Standard Item"}</Typography>
              <Typography variant="body2" sx={{ color: "var(--slate-700)" }}>{formatDimension(item.width, item.unit)} × {formatDimension(item.height, item.unit)} ({item.sq_ft} sq ft)</Typography>
              <Typography variant="body2" sx={{ color: "var(--slate-700)", textAlign: "right" }}>{item.pieces}</Typography>
              <Typography variant="body2" color="text.secondary">{item.is_manual_total ? "—" : `₹${item.rate.toLocaleString("en-IN")}`}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, textAlign: "right", color: "var(--slate-900)", whiteSpace: "nowrap" }}>{formatCurrency(item.total)}</Typography>
            </Box>
          ))}
        </Box>

        <InvoiceTotalCard subtotal={quotation.subtotal} discountAmount={quotation.discount_amount} />

        <InvoiceFooter>
          This is an estimate, not a bill - amounts are subject to change until converted to an invoice. For questions, please contact Zybrannox support.
        </InvoiceFooter>
      </Paper>

      {/* Convert-to-Invoice Dialog */}
      <Dialog open={convertOpen} onClose={() => !converting && setConvertOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Convert to Invoice</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            The customer, job type, line items, and discount carry over automatically - just confirm who's doing the work and when.
          </Typography>
          <AsyncSearchSelect
            label="Assigned To"
            placeholder="Search employees..."
            endpoint="/users"
            extraParams={{ role: "user", limit: 20 }}
            getOptionLabel={(u: EmployeeOption) => u.username}
            getOptionValue={(u: EmployeeOption) => u.username}
            value={convertAssignedTo}
            onChange={(v) => setConvertAssignedTo(v as string | undefined)}
          />
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Box sx={{ flex: 1 }}>
              <DateTimePicker label="Start Date" value={convertStartDate} onChange={setConvertStartDate} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <DateTimePicker label="Delivery Date" value={convertDeliveryDate} onChange={setConvertDeliveryDate} />
            </Box>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "var(--slate-500)", textTransform: "uppercase" }}>Priority</Typography>
            <Box sx={{ mt: 0.75 }}>
              <PillRadioGroup options={PRIORITY_OPTIONS} value={convertPriority} onChange={setConvertPriority} />
            </Box>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "var(--slate-500)", textTransform: "uppercase" }}>Client Status</Typography>
            <Box sx={{ mt: 0.75 }}>
              <PillRadioGroup options={CLIENT_STATUS_OPTIONS} value={convertClientStatus} onChange={setConvertClientStatus} />
            </Box>
          </Box>
          {convertError && <Alert severity="error" sx={{ borderRadius: 2 }}>{convertError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConvertOpen(false)} disabled={converting} sx={{ textTransform: "none", fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={handleConvert}
            disabled={converting}
            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
          >
            {converting ? "Converting..." : "Convert & Generate Invoice"}
          </Button>
        </DialogActions>
      </Dialog>

      <style>{`
        .invoice-sheet.pdf-exporting {
          box-shadow: none !important;
          border: none !important;
          border-radius: 0 !important;
        }

        @media print {
          @page { margin: 12mm; size: auto; }
          body {
            background-color: var(--white) !important;
            color: var(--black) !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * { visibility: hidden; }
          .invoice-sheet, .invoice-sheet * { visibility: visible; }
          .invoice-toolbar { display: none !important; }
          .invoice-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: transparent !important;
          }
          .invoice-row { page-break-inside: avoid; }
        }
      `}</style>
    </Box>
  );
}
