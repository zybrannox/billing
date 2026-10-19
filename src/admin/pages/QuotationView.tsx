import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Paper,
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
import FitScreenRoundedIcon from "@mui/icons-material/FitScreenRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import RequestQuoteRoundedIcon from "@mui/icons-material/RequestQuoteRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import ShareRoundedIcon from "@mui/icons-material/ShareRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import IosShareRoundedIcon from "@mui/icons-material/IosShareRounded";
import { saveAs } from "file-saver";

import { apiService } from "../../api/service";
import { useDialogStore } from "../../store/useDialogStore";
import QuotationSheet from "../components/QuotationSheet";
import FitToView, { type FitToViewHandle } from "../../documents/FitToView";
import type { QuotationDetail } from "../components/quotationSheetUtils";
import { generateInvoicePdf } from "../../utils/generateInvoicePdf";
import { shareToWhatsAppAfter } from "../../utils/shareToWhatsApp";
import AsyncSearchSelect from "../../ui/AsyncSearchSelect";
import DateTimePicker from "../../ui/DateTimePicker";
import PillRadioGroup from "../../common/components/PillRadioGroup";
import { PRIORITY_OPTIONS, CLIENT_STATUS_OPTIONS } from "../../common/components/pillRadioOptions";
import { formatRupeesFixed as formatCurrency } from "../../format/money";

interface EmployeeOption {
  username: string;
}

// Two hosts share this component: the routed /admin/quotations/:id page
// (the id comes from the URL) and the global "viewQuotation" dialog (see
// QuotationDialogView below), opened from a quotation card in a customer's
// quotations drawer so viewing one never navigates away. `embedded` is the
// dialog flavour: no Back button (the dialog has its own close), and no
// full-viewport sizing.
export default function QuotationView({
  quotationId,
  embedded = false,
}: {
  quotationId?: number | string;
  embedded?: boolean;
} = {}) {
  const params = useParams<{ id: string }>();
  const id = quotationId !== undefined ? String(quotationId) : params.id;
  const navigate = useNavigate();
  const { openDialog } = useDialogStore();
  const [quotation, setQuotation] = useState<QuotationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  // In the dialog, the document scales to fit without scrolling (see
  // documents/FitToView.tsx); the toolbar toggle switches to actual size.
  const fitRef = useRef<FitToViewHandle>(null);
  const [fit, setFit] = useState(true);
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
      // The capture must see the sheet at actual size, not scaled to fit.
      const capture = () => generateInvoicePdf(node, `Quotation-${quotation.quotation_number}.pdf`);
      return await (fitRef.current ? fitRef.current.runAtActualSize(capture) : capture());
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
  // utils/shareToWhatsApp.ts - it does the render/upload first, with this
  // tab still in front, and opens WhatsApp once the link is ready).
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
      <Box sx={{ height: embedded ? 240 : "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
        <CircularProgress size={36} thickness={4} />
        <Typography variant="body2" color="text.secondary">
          Preparing document...
        </Typography>
      </Box>
    );
  }

  if (error || !quotation) {
    return (
      <Box sx={{ height: embedded ? 320 : "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Paper elevation={0} sx={{ p: 5, textAlign: "center", maxWidth: 420, border: "1px dashed var(--slate-300)", borderRadius: 3 }}>
          <RequestQuoteRoundedIcon sx={{ fontSize: 48, color: "var(--slate-400)", mb: 1.5 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: "var(--slate-700)" }}>
            Quotation Not Found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
            The requested quotation could not be located or may have been deleted.
          </Typography>
          {!embedded && (
            <Button
              variant="contained"
              disableElevation
              startIcon={<ArrowBackRoundedIcon />}
              onClick={() => navigate("/admin/dashboard")}
              sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
            >
              Return to Dashboard
            </Button>
          )}
        </Paper>
      </Box>
    );
  }

  const isExpired =
    quotation.status === "pending" &&
    !!quotation.valid_until &&
    new Date(quotation.valid_until) < new Date();

  return (
    <Box sx={{ bgcolor: embedded ? "transparent" : "var(--slate-50)", minHeight: embedded ? undefined : "100vh", pb: 2 }}>
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
          {embedded ? (
            <Box />
          ) : (
            <Button
              startIcon={<ArrowBackRoundedIcon />}
              onClick={handleBack}
              sx={{ color: "var(--slate-600)", textTransform: "none", fontWeight: 600, "&:hover": { bgcolor: "var(--slate-200)" } }}
            >
              Back
            </Button>
          )}

          <Stack direction="row" spacing={1}>
            {embedded && (
              <Tooltip title={fit ? "Showing the whole quotation - click for actual size" : "Fit to screen"}>
                <IconButton
                  onClick={() => setFit((f) => !f)}
                  aria-pressed={fit}
                  sx={{
                    border: "1px solid var(--slate-200)",
                    borderRadius: 2,
                    color: fit ? "var(--blue-700)" : "var(--slate-700)",
                    bgcolor: fit ? "var(--blue-50)" : "transparent",
                    "&:hover": { bgcolor: fit ? "var(--blue-100)" : "var(--slate-100)" },
                  }}
                >
                  <FitScreenRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
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
                  <WhatsAppIcon fontSize="small" sx={{ color: "var(--brand-whatsapp)" }} />
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

      {/* Printable Quotation Sheet - the shared document layout, driven by
          the admin's Document Design settings (see src/documents). */}
      {embedded ? (
        // Extra room is reserved for the dialog's title, toolbar and the
        // accept/reject/convert bar above the document.
        <FitToView ref={fitRef} fit={fit} reserved={250}>
          <QuotationSheet ref={sheetRef} quotation={quotation} />
        </FitToView>
      ) : (
        <QuotationSheet ref={sheetRef} quotation={quotation} />
      )}

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

// The "viewQuotation" global dialog's content (see App.tsx) - the same view
// as the routed page, hosted in a dialog. Keyed by id so opening a different
// quotation starts from a clean state.
export function QuotationDialogView() {
  const editingId = useDialogStore((s) => s.editingId);
  if (editingId === null) return null;
  return <QuotationView key={editingId} embedded quotationId={editingId} />;
}
