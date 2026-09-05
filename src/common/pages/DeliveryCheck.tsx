import { useEffect, useState } from "react";
import { Box, Typography, Button as MuiButton, CircularProgress, Alert } from "@mui/material";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import { apiService } from "../../api/service";
import { useDialogStore } from "../../store/useDialogStore";
import { useProjectStore } from "../../store/useProjectStore";
import { useAppStore } from "../../store/useAppStore";
import TextField from "../../ui/TextField";
import Dropdown from "../../ui/Dropdown";
import Button from "../../ui/Button";
import {
  InvoiceMetaPanel,
  InvoicePanelLabel,
  InvoiceTotalCard,
  invoiceTheme,
} from "../../admin/components/InvoiceDocument";

// No payment gateway anywhere in this app - recorded manually by an admin
// after money already changed hands some other way. Mirrors the backend's
// PaymentMethod literal (app/invoices/model.py).
const PAYMENT_METHODS = ["Cash", "UPI", "Bank Transfer", "Card", "Cheque", "Other"];

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
  invoice_number: string;
  subtotal: number;
  discount_amount: number;
  amount: number;
  status: "pending" | "paid" | "cancelled";
  advance_amount: number;
  payment_method: string | null;
  balance_due: number;
  project: { project_type: string; description: string | null } | null;
  customer: { first_name: string; last_name: string; contact_number: string; email: string } | null;
  items: InvoiceItem[];
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: "#FEF3C7", color: "#92400E", label: "Pending" },
  paid: { bg: "#DCFCE7", color: "#166534", label: "Paid" },
  cancelled: { bg: "#FEE2E2", color: "#991B1B", label: "Cancelled" },
};

const colHeaderSx = {
  fontWeight: 700,
  fontSize: "0.7rem",
  letterSpacing: "0.05em",
  textTransform: "uppercase" as const,
  color: invoiceTheme.tableHeaderText,
};

export default function DeliveryCheck() {
  const { editingId, closeDialog } = useDialogStore();
  const { markDelivered } = useProjectStore();
  const { user } = useAppStore();
  const isAdmin = user?.role === "admin";
  const projectId = editingId;

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notInvoiced, setNotInvoiced] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [discountInput, setDiscountInput] = useState("");
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [applyingDiscount, setApplyingDiscount] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [markingPaid, setMarkingPaid] = useState(false);

  const [delivering, setDelivering] = useState(false);

  const loadInvoice = () => {
    if (!projectId) return;
    setLoading(true);
    setNotInvoiced(false);
    setLoadError(false);
    apiService
      .get<InvoiceDetail>(`/invoices/project/${projectId}/latest`)
      .then((data) => {
        setInvoice(data);
        setDiscountInput(data.discount_amount ? String(data.discount_amount) : "");
        // If an advance was already recorded, the final payment is most
        // often settled the same way - a sensible default, still fully
        // editable before actually marking it paid.
        setPaymentMethod(data.payment_method || "");
      })
      .catch((err) => {
        if (err?.response?.status === 404) setNotInvoiced(true);
        else setLoadError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(loadInvoice, [projectId]);

  const handleApplyDiscount = async () => {
    if (!invoice) return;
    setDiscountError(null);
    const value = Number(discountInput || 0);
    if (!Number.isFinite(value) || value < 0) {
      setDiscountError("Enter a valid discount amount.");
      return;
    }
    if (value === invoice.discount_amount) return;

    setApplyingDiscount(true);
    try {
      const updated = await apiService.patch<InvoiceDetail>(`/invoices/${invoice.id}`, {
        discount_amount: value,
      });
      setInvoice((prev) => (prev ? { ...prev, ...updated } : prev));
    } catch (err: any) {
      setDiscountError(
        err?.response?.data?.detail || "Couldn't apply that discount. Please try again.",
      );
    } finally {
      setApplyingDiscount(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!invoice) return;
    setPaymentError(null);
    if (!paymentMethod) {
      setPaymentError("Pick how this was paid before marking it as paid.");
      return;
    }

    setMarkingPaid(true);
    try {
      const updated = await apiService.patch<InvoiceDetail>(
        `/invoices/${invoice.id}/mark-paid`,
        {
          payment_method: paymentMethod,
          payment_reference: paymentReference.trim() || undefined,
        },
      );
      setInvoice((prev) => (prev ? { ...prev, ...updated } : prev));
    } catch (err: any) {
      setPaymentError(
        err?.response?.data?.detail || "Couldn't mark this invoice as paid. Please try again.",
      );
    } finally {
      setMarkingPaid(false);
    }
  };

  const handleDeliver = async () => {
    if (!projectId) return;
    setDelivering(true);
    try {
      await markDelivered(String(projectId));
      closeDialog();
    } finally {
      setDelivering(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (loadError) {
    return (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <Typography color="text.secondary">Couldn't load this order's payment details.</Typography>
      </Box>
    );
  }

  if (notInvoiced) {
    return (
      <Box>
        <Alert severity="warning" sx={{ mb: 3 }}>
          This order hasn't been invoiced yet. Generate an invoice and complete the payment before
          it can be marked as delivered.
        </Alert>
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <MuiButton onClick={closeDialog} sx={{ color: "text.secondary", textTransform: "none" }}>
            Close
          </MuiButton>
        </Box>
      </Box>
    );
  }

  if (!invoice) return null;

  const statusStyle = STATUS_STYLES[invoice.status] ?? STATUS_STYLES.pending;
  const customerName = invoice.customer
    ? `${invoice.customer.first_name} ${invoice.customer.last_name}`
    : "—";
  const canEditDiscount = isAdmin && invoice.status === "pending";
  // Marking paid is available to anyone (see the dedicated
  // PATCH /invoices/{id}/mark-paid this now calls) - recording that a
  // delivery was paid for is part of completing your own assigned work,
  // not a financial-oversight action like the discount above, which stays
  // admin-only. Always available while pending, not gated on the balance
  // already being zero (a discount can get it there, but doesn't have
  // to - most invoices get settled by an actual payment, not a discount).
  const canCompletePayment = invoice.status === "pending";
  const canDeliver = invoice.status === "paid";

  return (
    <Box>
      <InvoiceMetaPanel>
        <Box>
          <InvoicePanelLabel>Billed To</InvoicePanelLabel>
          <Typography sx={{ fontWeight: 600, mt: 0.5 }}>{customerName}</Typography>
          {invoice.customer && (
            <Typography variant="body2" color="text.secondary">
              {invoice.customer.contact_number}
            </Typography>
          )}
        </Box>
        <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
          <Typography variant="body2" color="text.secondary">
            {invoice.invoice_number}
          </Typography>
          <Box
            sx={{
              display: "inline-flex",
              mt: 0.5,
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
      </InvoiceMetaPanel>

      {invoice.project && (
        <Typography variant="body2" sx={{ fontWeight: 600, color: "#0f172a", mb: 2 }}>
          {invoice.project.project_type} Order
          {invoice.project.description ? ` — ${invoice.project.description}` : ""}
        </Typography>
      )}

      {/* Order breakdown - every line item that makes up this order, with
          its own size and rate, not just the invoice's bottom-line total. */}
      <Box sx={{ border: `1px solid ${invoiceTheme.panelBorder}`, borderRadius: 2, overflow: "hidden", mb: 2 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "28px 2fr 1fr 1fr 1.1fr",
            gap: 1,
            bgcolor: invoiceTheme.tableHeaderBg,
            borderBottom: `2px solid ${invoiceTheme.tableHeaderBorder}`,
            px: 2,
            py: 1,
            alignItems: "center",
          }}
        >
          <Typography sx={colHeaderSx}>No.</Typography>
          <Typography sx={colHeaderSx}>Order</Typography>
          <Typography sx={colHeaderSx}>Size</Typography>
          <Typography sx={colHeaderSx}>Rate</Typography>
          <Typography sx={{ ...colHeaderSx, textAlign: "right" }}>Price</Typography>
        </Box>
        {invoice.items.map((item, idx) => (
          <Box
            key={item.id}
            sx={{
              display: "grid",
              gridTemplateColumns: "28px 2fr 1fr 1fr 1.1fr",
              gap: 1,
              px: 2,
              py: 1.1,
              alignItems: "center",
              borderTop: idx === 0 ? "none" : `1px solid ${invoiceTheme.rowBorder}`,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {idx + 1}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {item.description || "—"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {item.width} × {item.height} ({item.sq_ft} sq ft)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ₹{item.rate.toLocaleString()}
            </Typography>
            <Typography sx={{ fontWeight: 700, textAlign: "right" }}>
              ₹{item.total.toLocaleString()}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Discount - admin-only, and only while the invoice is still
          pending (see service_update's own enforcement of the same rule
          server-side). Applying it here updates the total/balance below
          immediately, without leaving this dialog. */}
      {canEditDiscount && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1.5 }}>
            <Box sx={{ width: 200 }}>
              <TextField
                type="number"
                label="Discount"
                placeholder="0.00"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
              />
            </Box>
            <MuiButton
              size="small"
              onClick={handleApplyDiscount}
              disabled={applyingDiscount}
              sx={{ textTransform: "none", fontWeight: 600, color: "#2563EB", mb: 0.25 }}
            >
              {applyingDiscount ? "Applying..." : "Apply Discount"}
            </MuiButton>
          </Box>
          {discountError && (
            <Alert severity="error" sx={{ mt: 1.5 }}>
              {discountError}
            </Alert>
          )}
        </Box>
      )}

      {/* Complete Payment - available to any role, pending-only, and
          independent of the discount above: marking paid is the explicit
          "this was settled" declaration, not something that unlocks itself
          once the balance happens to hit zero. Calls the dedicated
          PATCH /invoices/{id}/mark-paid (see controller.py) rather than the
          generic update Billing.tsx's admin-only "Mark Paid" uses, since
          this one has to stay safe for non-admins to call. */}
      {canCompletePayment && (
        <Box
          sx={{
            mb: 3,
            p: 2,
            borderRadius: 2,
            bgcolor: invoiceTheme.panelBg,
            border: `1px solid ${invoiceTheme.panelBorder}`,
          }}
        >
          <InvoicePanelLabel>Complete Payment</InvoicePanelLabel>
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 1.5, mt: 1 }}>
            <Box sx={{ width: 180 }}>
              <Dropdown
                placeholder="Payment method"
                options={PAYMENT_METHODS}
                value={paymentMethod || undefined}
                onChange={(v) => setPaymentMethod((v as string) || "")}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 180 }}>
              <TextField
                placeholder="Reference / note (optional)"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            </Box>
            <Button onClick={handleMarkPaid} disabled={markingPaid}>
              {markingPaid ? "Marking Paid..." : "Mark as Paid"}
            </Button>
          </Box>
          {paymentError && (
            <Alert severity="error" sx={{ mt: 1.5 }}>
              {paymentError}
            </Alert>
          )}
        </Box>
      )}

      <InvoiceTotalCard
        subtotal={invoice.subtotal}
        discountAmount={invoice.discount_amount}
        advanceAmount={invoice.advance_amount}
        paymentMethod={invoice.payment_method}
      />

      {!canDeliver && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {invoice.status === "cancelled"
            ? "This invoice was cancelled - generate a new one and complete payment before delivering."
            : "Payment must be completed before this order can be marked as delivered."}
        </Alert>
      )}

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5, mt: 3 }}>
        <MuiButton onClick={closeDialog} sx={{ color: "text.secondary", textTransform: "none" }}>
          Close
        </MuiButton>
        <Button
          onClick={handleDeliver}
          disabled={!canDeliver || delivering}
          startIcon={<LocalShippingRoundedIcon fontSize="small" />}
        >
          {delivering ? "Delivering..." : "Mark as Delivered"}
        </Button>
      </Box>
    </Box>
  );
}
