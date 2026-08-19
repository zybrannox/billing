import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Typography, Button, CircularProgress } from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { apiService } from "../../api/service";
import { formatDate } from "../../utils/dateFormatter";

interface InvoiceDetail {
  id: number;
  project_id: number;
  invoice_number: string;
  amount: number;
  status: "pending" | "paid" | "cancelled";
  created_at: string;
  due_date: string | null;
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
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: "#FEF3C7", color: "#92400E", label: "Pending" },
  paid: { bg: "#DCFCE7", color: "#166534", label: "Paid" },
  cancelled: { bg: "#FEE2E2", color: "#991B1B", label: "Cancelled" },
};

export default function InvoiceView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
      <Box
        sx={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error || !invoice) {
    return (
      <Box
        sx={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <Typography color="text.secondary">Invoice not found.</Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/admin/billing")}>
          Back to Billing
        </Button>
      </Box>
    );
  }

  const statusStyle = STATUS_STYLES[invoice.status] ?? STATUS_STYLES.pending;
  const customerName = invoice.customer
    ? `${invoice.customer.first_name} ${invoice.customer.last_name}`
    : "—";

  return (
    <Box sx={{ bgcolor: "#f1f5f9", minHeight: "100vh", py: 5 }}>
      {/* Toolbar - hidden when printing */}
      <Box
        className="invoice-toolbar"
        sx={{
          maxWidth: 800,
          mx: "auto",
          mb: 2,
          px: { xs: 2, sm: 0 },
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/admin/billing")}
          sx={{ color: "text.secondary" }}
        >
          Back
        </Button>
        <Button
          variant="contained"
          startIcon={<PrintIcon />}
          onClick={() => window.print()}
        >
          Print / Save PDF
        </Button>
      </Box>

      {/* Printable document */}
      <Box
        className="invoice-sheet"
        sx={{
          maxWidth: 800,
          mx: "auto",
          bgcolor: "#fff",
          borderRadius: 2,
          boxShadow: "0 4px 24px rgba(15, 23, 42, 0.08)",
          p: { xs: 3, sm: 6 },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 5,
            pb: 3,
            borderBottom: "2px solid #0f172a",
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: "1.75rem",
                fontWeight: 800,
                color: "#0f172a",
                letterSpacing: "-0.5px",
              }}
            >
              Zybrannox
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Print & Signage Solutions
            </Typography>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <Typography
              sx={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a" }}
            >
              INVOICE
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {invoice.invoice_number}
            </Typography>
          </Box>
        </Box>

        {/* Bill To / Invoice meta */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 4,
            mb: 5,
          }}
        >
          <Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                letterSpacing: "0.5px",
                color: "text.secondary",
                textTransform: "uppercase",
              }}
            >
              Bill To
            </Typography>
            <Typography sx={{ fontWeight: 600, mt: 0.5 }}>
              {customerName}
            </Typography>
            {invoice.customer && (
              <>
                <Typography variant="body2" color="text.secondary">
                  {invoice.customer.email}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {invoice.customer.contact_number}
                </Typography>
              </>
            )}
          </Box>

          <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
            <Box sx={{ display: "flex", justifyContent: { sm: "flex-end" }, gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Invoice Date:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {formatDate(invoice.created_at)}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: { sm: "flex-end" }, gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Due Date:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {formatDate(invoice.due_date)}
              </Typography>
            </Box>
            <Box
              sx={{
                display: "inline-flex",
                mt: 1,
                px: 1.5,
                py: 0.5,
                borderRadius: 1.5,
                bgcolor: statusStyle.bg,
                color: statusStyle.color,
                fontSize: "0.75rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {statusStyle.label}
            </Box>
          </Box>
        </Box>

        {/* Order details table */}
        <Box
          sx={{
            border: "1px solid #e2e8f0",
            borderRadius: 2,
            overflow: "hidden",
            mb: 4,
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              bgcolor: "#0f172a",
              color: "#fff",
              px: 2.5,
              py: 1.25,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Description
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Amount
            </Typography>
          </Box>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              px: 2.5,
              py: 2,
              gap: 1,
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: 600 }}>
                {invoice.project?.project_type ?? "Project"} Order
              </Typography>
              {invoice.project?.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {invoice.project.description}
                </Typography>
              )}
              {invoice.project?.delivery_date && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                  Delivery: {formatDate(invoice.project.delivery_date)}
                </Typography>
              )}
            </Box>
            <Typography sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
              ₹{invoice.amount.toLocaleString()}
            </Typography>
          </Box>
        </Box>

        {/* Total */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            pt: 2,
            borderTop: "2px solid #0f172a",
          }}
        >
          <Box sx={{ minWidth: 220 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
                Total
              </Typography>
              <Typography sx={{ fontWeight: 800, fontSize: "1.1rem" }}>
                ₹{invoice.amount.toLocaleString()}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Footer */}
        <Box sx={{ mt: 6, pt: 3, borderTop: "1px solid #e2e8f0" }}>
          <Typography variant="caption" color="text.secondary">
            Thank you for your business. For questions about this invoice,
            please contact Zybrannox support.
          </Typography>
        </Box>
      </Box>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .invoice-sheet, .invoice-sheet * { visibility: visible; }
          .invoice-toolbar { display: none !important; }
          .invoice-sheet {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </Box>
  );
}
