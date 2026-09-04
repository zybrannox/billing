import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Paper,
  Chip,
  Stack,
} from "@mui/material";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import FolderOpenRoundedIcon from "@mui/icons-material/FolderOpenRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import PendingOutlinedIcon from "@mui/icons-material/PendingOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";

import { apiService } from "../../api/service";
import { formatDate } from "../../utils/dateFormatter";
import {
  InvoiceHeader,
  InvoiceMetaPanel,
  InvoicePanelLabel,
  InvoiceTotalCard,
  InvoiceFooter,
} from "../components/InvoiceDocument";

interface InvoiceItem {
  id: number;
  description: string | null;
  width: number;
  height: number;
  sq_ft: number;
  rate: number;
  total: number;
}

interface InvoiceDetail {
  id: number;
  project_id: number;
  invoice_number: string;
  subtotal: number;
  discount_amount: number;
  amount: number;
  status: "pending" | "paid" | "cancelled";
  created_at: string;
  due_date: string | null;
  advance_amount: number;
  payment_method: string | null;
  payment_reference: string | null;
  balance_due: number;
  project: {
    id: number;
    project_type: string;
    description: string | null;
    start_date: string | null;
    delivery_date: string | null;
  } | null;
  customer: {
    first_name: string;
    last_name: string;
    contact_number: string;
    email: string;
  } | null;
  items: InvoiceItem[];
}

const STATUS_CONFIG: Record<
  string,
  { bg: string; color: string; border: string; label: string; icon: React.ReactElement }
> = {
  pending: {
    bg: "#FEF3C7",
    color: "#92400E",
    border: "#FCD34D",
    label: "Payment Pending",
    icon: <PendingOutlinedIcon sx={{ fontSize: "0.9rem !important" }} />,
  },
  paid: {
    bg: "#DCFCE7",
    color: "#166534",
    border: "#86EFAC",
    label: "Paid in Full",
    icon: <CheckCircleOutlineRoundedIcon sx={{ fontSize: "0.9rem !important" }} />,
  },
  cancelled: {
    bg: "#FEE2E2",
    color: "#991B1B",
    border: "#FCA5A5",
    label: "Cancelled",
    icon: <CancelOutlinedIcon sx={{ fontSize: "0.9rem !important" }} />,
  },
};

const formatCurrency = (val: number) =>
  `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function InvoiceView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // This invoice can be reached from more than one place now (Billing's
  // "View", or straight from generating one in Projects/Delivery) - always
  // sending "Back" to Billing was wrong whenever it wasn't where the user
  // actually came from. Going back through the SPA's own history returns
  // to wherever that really was; `history.state.idx` is how React Router
  // tracks how deep into its own navigation stack we are, so this only
  // does that when there's somewhere real to go back to (not on a fresh
  // page load/direct link), falling back to Billing otherwise.
  const handleBack = () => {
    const canGoBack = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (canGoBack > 0) navigate(-1);
    else navigate("/admin/billing");
  };

  useEffect(() => {
    let active = true;
    apiService
      .get<InvoiceDetail>(`/invoices/${id}/details`)
      .then((data) => {
        if (active) setInvoice(data);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

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

  if (error || !invoice) {
    return (
      <Box sx={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Paper elevation={0} sx={{ p: 5, textAlign: "center", maxWidth: 420, border: "1px dashed #CBD5E1", borderRadius: 3 }}>
          <ReceiptLongRoundedIcon sx={{ fontSize: 48, color: "#94A3B8", mb: 1.5 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#334155" }}>
            Invoice Not Found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
            The requested invoice record could not be located or may have been deleted.
          </Typography>
          <Button
            variant="contained"
            disableElevation
            startIcon={<ArrowBackRoundedIcon />}
            onClick={() => navigate("/admin/billing")}
            sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
          >
            Return to Billing
          </Button>
        </Paper>
      </Box>
    );
  }

  const status = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.pending;
  const customerName = invoice.customer
    ? `${invoice.customer.first_name} ${invoice.customer.last_name}`
    : "—";

  return (
    <Box sx={{ bgcolor: "#F8FAFC", minHeight: "100vh", pb: 2 }}>
      {/* Non-Printable Sticky Toolbar */}
      <Box
        className="invoice-toolbar"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          backdropFilter: "blur(8px)",
          bgcolor: "rgba(248, 250, 252, 0.85)",
          borderBottom: "1px solid #E2E8F0",
          py: 1,
          mb: 1.5,
        }}
      >
        <Box
          sx={{
            maxWidth: 840,
            mx: "auto",
            px: { xs: 2, sm: 3 },
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Button
            startIcon={<ArrowBackRoundedIcon />}
            onClick={handleBack}
            sx={{
              color: "#475569",
              textTransform: "none",
              fontWeight: 600,
              "&:hover": { bgcolor: "#E2E8F0" },
            }}
          >
            Back
          </Button>

          <Stack direction="row" spacing={1.5}>
            <Button
              variant="contained"
              disableElevation
              startIcon={<PrintRoundedIcon />}
              onClick={() => window.print()}
              sx={{
                bgcolor: "#0F172A",
                color: "#FFFFFF",
                textTransform: "none",
                fontWeight: 600,
                borderRadius: 2,
                px: 2.5,
                "&:hover": { bgcolor: "#1E293B" },
              }}
            >
              Print / Save PDF
            </Button>
          </Stack>
        </Box>
      </Box>

      {/* Printable Invoice Sheet */}
      <Paper
        className="invoice-sheet"
        elevation={0}
        sx={{
          maxWidth: 840,
          mx: "auto",
          bgcolor: "#FFFFFF",
          borderRadius: 3,
          border: "1px solid #E2E8F0",
          boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.05)",
          p: { xs: 2.5, sm: 3.5 },
        }}
      >
        <InvoiceHeader invoiceNumber={invoice.invoice_number} />

        {/* Bill To & Metadata Section */}
        <InvoiceMetaPanel>
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Box sx={{ p: 1, bgcolor: "#F1F5F9", borderRadius: 1.5, color: "#475569", height: "fit-content" }}>
              <PersonRoundedIcon fontSize="small" />
            </Box>
            <Box>
              <InvoicePanelLabel>Billed To</InvoicePanelLabel>
              <Typography sx={{ fontWeight: 700, color: "#0F172A", fontSize: "1.05rem", mt: 0.2 }}>
                {customerName}
              </Typography>
              {invoice.customer && (
                <Stack spacing={0.2} sx={{ mt: 0.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.85rem" }}>
                    {invoice.customer.email}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.85rem" }}>
                    {invoice.customer.contact_number}
                  </Typography>
                </Stack>
              )}
            </Box>
          </Box>

          <Box sx={{ textAlign: { xs: "left", sm: "right" }, mt: { xs: 2, sm: 0 } }}>
            <Stack spacing={0.5} alignItems={{ xs: "flex-start", sm: "flex-end" }}>
              <Box sx={{ display: "flex", justifyContent: { sm: "flex-end" }, gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Invoice Date:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "#334155" }}>
                  {formatDate(invoice.created_at)}
                </Typography>
              </Box>
              {invoice.due_date && (
                <Box sx={{ display: "flex", justifyContent: { sm: "flex-end" }, gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Due Date:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "#334155" }}>
                    {formatDate(invoice.due_date)}
                  </Typography>
                </Box>
              )}
              <Box sx={{ pt: 0.5 }}>
                <Chip
                  icon={status.icon}
                  label={status.label}
                  size="small"
                  sx={{
                    bgcolor: status.bg,
                    color: status.color,
                    border: `1px solid ${status.border}`,
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    letterSpacing: "0.02em",
                    "& .MuiChip-icon": { color: status.color },
                  }}
                />
              </Box>
            </Stack>
          </Box>
        </InvoiceMetaPanel>

        {/* Project Context Box */}
        {(invoice.project?.description || invoice.project?.delivery_date || invoice.project?.project_type) && (
          <Box
            sx={{
              mb: 1.5,
              p: 1.25,
              borderRadius: 2,
              bgcolor: "#F8FAFC",
              border: "1px solid #E2E8F0",
              display: "flex",
              alignItems: "flex-start",
              gap: 1.5,
            }}
          >
            <FolderOpenRoundedIcon sx={{ color: "#64748B", mt: 0.2 }} fontSize="small" />
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "#0F172A" }}>
                {invoice.project?.project_type ?? "Custom Work"} Order
              </Typography>
              {invoice.project?.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, fontSize: "0.85rem" }}>
                  {invoice.project.description}
                </Typography>
              )}
            </Box>
            {invoice.project?.delivery_date && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, bgcolor: "#FFFFFF", px: 1.5, py: 0.5, borderRadius: 1.5, border: "1px solid #E2E8F0" }}>
                <EventRoundedIcon sx={{ fontSize: "0.85rem", color: "#64748B" }} />
                <Typography variant="caption" sx={{ fontWeight: 600, color: "#475569" }}>
                  Delivery: {formatDate(invoice.project.delivery_date)}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Items Breakdown Table */}
        <Box
          sx={{
            border: "1px solid #E2E8F0",
            borderRadius: 2.5,
            overflow: "hidden",
            mb: 1.5,
          }}
        >
          {/* Header */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "28px 2.5fr 1.2fr 1fr 1.2fr",
              bgcolor: "#F8FAFC",
              borderBottom: "1px solid #E2E8F0",
              px: 2,
              py: 0.75,
              gap: 1.5,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              #
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Item Description
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Size / Area
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Rate (₹)
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, textAlign: "right", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Total Amount
            </Typography>
          </Box>

          {/* Rows */}
          {invoice.items.map((item, idx) => (
            <Box
              key={item.id}
              className="invoice-row"
              sx={{
                display: "grid",
                gridTemplateColumns: "28px 2.5fr 1.2fr 1fr 1.2fr",
                px: 2,
                py: 0.9,
                gap: 1.5,
                alignItems: "center",
                borderTop: idx === 0 ? "none" : "1px solid #F1F5F9",
                bgcolor: idx % 2 === 0 ? "#FFFFFF" : "#FAFAFA",
              }}
            >
              <Typography variant="body2" sx={{ color: "#94A3B8", fontWeight: 600 }}>
                {idx + 1}
              </Typography>

              <Typography variant="body2" sx={{ fontWeight: 600, color: "#1E293B" }}>
                {item.description || "Standard Item"}
              </Typography>

              <Typography variant="body2" sx={{ color: "#334155" }}>
                {item.width}' × {item.height}' ({item.sq_ft} sq ft)
              </Typography>

              <Typography variant="body2" color="text.secondary">
                ₹{item.rate.toLocaleString("en-IN")}
              </Typography>

              <Typography variant="body2" sx={{ fontWeight: 700, textAlign: "right", color: "#0F172A", whiteSpace: "nowrap" }}>
                {formatCurrency(item.total)}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Calculation Summary Card */}
        <InvoiceTotalCard
          subtotal={invoice.subtotal}
          discountAmount={invoice.discount_amount}
          advanceAmount={invoice.advance_amount}
          paymentMethod={invoice.payment_method}
        />

        {/* Reference details */}
        {invoice.payment_reference && (
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ bgcolor: "#F1F5F9", px: 1.5, py: 0.5, borderRadius: 1 }}>
              Payment Ref: <strong>{invoice.payment_reference}</strong>
            </Typography>
          </Box>
        )}

        <InvoiceFooter />
      </Paper>

      {/* Global CSS for Print Optimization */}
      <style>{`
        @media print {
          @page {
            margin: 12mm;
            size: auto;
          }
          body {
            background-color: #FFFFFF !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          .invoice-sheet, .invoice-sheet * {
            visibility: visible;
          }
          .invoice-toolbar {
            display: none !important;
          }
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
          .invoice-row {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </Box>
  );
}