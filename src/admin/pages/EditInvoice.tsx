import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button as MuiButton,
  CircularProgress,
  Alert,
  Paper,
  Divider,
  InputAdornment,
} from "@mui/material";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import FolderOpenRoundedIcon from "@mui/icons-material/FolderOpenRounded";
import DiscountRoundedIcon from "@mui/icons-material/DiscountRounded";

import { apiService } from "../../api/service";
import { useDialogStore } from "../../store/useDialogStore";
import TextField from "../../ui/TextField";
import DateTimePicker from "../../ui/DateTimePicker";
import Button from "../../ui/Button";
import ItemLineEditor from "../../common/components/ItemLineEditor";
import {
  totalOf,
  toNumber,
  piecesOf,
  type ItemRow,
  type ItemTypeOption,
} from "../../common/components/itemLineUtils";
import {
  InvoiceMetaPanel,
  InvoicePanelLabel,
  InvoiceTotalCard,
} from "../components/InvoiceDocument";
import { type InvoiceDetail, type InvoiceItem } from "../components/invoiceSheetUtils";

const numberFieldSx = {
  "& .MuiInputBase-root": { px: 1, height: 40, fontSize: "0.875rem" },
  "& input": { textAlign: "right" as const, px: 0.5, py: 0.75 },
  "& input[type=number]": { MozAppearance: "textfield" as const },
  "& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button": {
    WebkitAppearance: "none",
    margin: 0,
  },
  "& .MuiInputAdornment-root": {
    m: 0,
    "& .MuiTypography-root": { fontSize: "0.75rem", color: "var(--slate-500)", fontWeight: 600 },
  },
};

// A fresh, stable React key per edit session is all this needs (unlike
// itemLineUtils.newRow's own counter, exported nowhere for reuse) - these
// rows are never mixed with ones newRow created.
let editRowCounter = 0;
const rowFromItem = (item: InvoiceItem): ItemRow => ({
  key: `edit-row-${item.id}-${++editRowCounter}`,
  itemType: "",
  description: item.description ?? "",
  width: String(item.width),
  height: String(item.height),
  unit: item.unit,
  rate: String(item.rate),
  pieces: String(item.pieces),
  // Only pre-fill the Total override when this line's total was actually
  // typed directly at creation (see InvoiceItem.is_manual_total) - otherwise
  // leave it blank so it keeps computing live from rate x area x pieces as
  // any of those are edited here, same as ItemLineEditor already does on
  // Create.
  total: item.is_manual_total ? item.total.toFixed(2) : "",
  pixelWidth: null,
  pixelHeight: null,
});

const extractErrorMessage = (err: any): string => {
  const detail = err?.detail ?? err?.message;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  return "Something went wrong while saving the invoice. Please try again.";
};

// Admin-only (opened from InvoiceView.tsx's "Edit" action, which is itself
// only shown to admins) and only while an invoice is still pending - the
// backend (service_update) enforces the same rule regardless, but checking
// here too means a stale dialog left open across a status change (an
// invoice paid on another tab, say) fails with a clear message instead of a
// confusing mid-submit rejection.
export default function EditInvoice() {
  const { editingId, closeDialog, openDialog } = useDialogStore();
  const id = editingId;

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [items, setItems] = useState<ItemRow[]>([]);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState("");
  const [itemTypeOptions, setItemTypeOptions] = useState<ItemTypeOption[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);

  useEffect(() => {
    apiService
      .get<ItemTypeOption[]>("/list-options/", { params: { category: "item_type", active_only: true } })
      .then(setItemTypeOptions)
      .catch((err) => console.error("Failed to load item type catalog", err));
  }, []);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setLoadError(false);
    apiService
      .get<InvoiceDetail>(`/invoices/${id}/details`)
      .then((data) => {
        if (!active) return;
        setInvoice(data);
        setItems(data.items.map(rowFromItem));
        setDueDate(data.due_date);
        setDiscountAmount(data.discount_amount ? String(data.discount_amount) : "");
      })
      .catch(() => {
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const grandTotal = useMemo(
    () => Math.round(items.reduce((sum, r) => sum + totalOf(r), 0) * 100) / 100,
    [items]
  );

  const handleSave = async () => {
    if (!invoice) return;
    setSubmitError(null);
    setRowError(null);
    setDiscountError(null);

    const usable: ItemRow[] = [];
    for (const row of items) {
      const filled = [row.width, row.height, row.rate].filter((v) => v.trim() !== "");
      if (filled.length === 0) continue;
      if (
        filled.length < 3 ||
        toNumber(row.width) <= 0 ||
        toNumber(row.height) <= 0 ||
        toNumber(row.rate) < 0 ||
        !Number.isInteger(toNumber(row.pieces)) ||
        toNumber(row.pieces) < 1
      ) {
        setRowError(
          "Each item needs a valid width, height, and rate (rate can be 0, dimensions must be > 0), and a whole number of pieces (1 or more)."
        );
        return;
      }
      usable.push(row);
    }

    if (usable.length === 0) {
      setRowError("Add at least one item with standard dimensions and a rate.");
      return;
    }

    const subtotal = Math.round(usable.reduce((sum, r) => sum + totalOf(r), 0) * 100) / 100;
    const discount = toNumber(discountAmount);
    if (discountAmount.trim() !== "" && discount > subtotal) {
      setDiscountError("Discount can't be more than the invoice subtotal.");
      return;
    }

    setSubmitting(true);
    try {
      const updated = await apiService.patch<{ id: number }>(`/invoices/${invoice.id}`, {
        items: usable.map((r) => ({
          description: r.description.trim() || undefined,
          width: toNumber(r.width),
          height: toNumber(r.height),
          unit: r.unit,
          rate: toNumber(r.rate),
          pieces: piecesOf(r),
          is_manual_total: r.total !== "",
        })),
        // Always sent (never gated on being non-empty/non-zero, unlike
        // Create's own version of these fields) - this is an edit of
        // values that already exist, so clearing a due date or dropping a
        // discount back to 0 has to actually reach the backend rather than
        // being silently dropped from the request as "unchanged".
        due_date: dueDate || null,
        discount_amount: discount,
      });
      closeDialog();
      openDialog("viewInvoice", updated.id, "view");
    } catch (err: any) {
      console.error("Error updating invoice", err);
      setSubmitError(extractErrorMessage(err?.response?.data || err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 8, gap: 2 }}>
        <CircularProgress size={36} thickness={4} />
        <Typography variant="body2" color="text.secondary">
          Loading invoice...
        </Typography>
      </Box>
    );
  }

  if (loadError || !invoice) {
    return (
      <Paper elevation={0} sx={{ textAlign: "center", py: 6, px: 3, border: "1px dashed var(--slate-300)", borderRadius: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "var(--slate-600)" }}>
          Unable to Load Invoice
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          We couldn't retrieve the details for this invoice.
        </Typography>
      </Paper>
    );
  }

  if (invoice.status !== "pending") {
    return (
      <Paper elevation={0} sx={{ textAlign: "center", py: 6, px: 3, border: "1px dashed var(--slate-300)", borderRadius: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "var(--slate-600)" }}>
          This Invoice Can't Be Edited
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
          {invoice.invoice_number} is already {invoice.status} - editing is only available while an
          invoice is still pending.
        </Typography>
        <MuiButton
          variant="contained"
          disableElevation
          onClick={closeDialog}
          sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
        >
          Close
        </MuiButton>
      </Paper>
    );
  }

  const customer = invoice.customer;
  const customerName = customer ? `${customer.first_name} ${customer.last_name}` : "Unassigned Customer";

  return (
    <Box sx={{ width: "100%", maxWidth: 1280, minWidth: 0, margin: "0 auto", p: { xs: 1.5, sm: 2.5 } }}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2.5,
          bgcolor: "var(--slate-50)",
          border: "1px solid var(--slate-200)",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Box sx={{ p: 1, bgcolor: "var(--blue-50)", borderRadius: 2, color: "var(--blue-600)", display: "flex" }}>
          <ReceiptLongRoundedIcon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "var(--slate-800)" }}>
            Editing {invoice.invoice_number}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Changes to items or discount recalculate the total - the balance due updates to match.
          </Typography>
        </Box>
      </Paper>

      <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 3, border: "1px solid var(--slate-200)", bgcolor: "var(--white)" }}>
        <InvoiceMetaPanel>
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
            <Box sx={{ p: 1, bgcolor: "var(--slate-100)", borderRadius: 1.5, color: "var(--slate-600)", mt: 0.5 }}>
              <PersonRoundedIcon fontSize="small" />
            </Box>
            <Box>
              <InvoicePanelLabel>Billed To</InvoicePanelLabel>
              <Typography sx={{ fontWeight: 700, color: "var(--slate-900)", fontSize: "0.95rem" }}>
                {customerName}
              </Typography>
              {customer && (
                <Box sx={{ mt: 0.25 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.85rem", lineHeight: 1.4 }}>
                    {customer.email}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.85rem", lineHeight: 1.4 }}>
                    {customer.contact_number}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, alignItems: { xs: "flex-start", sm: "flex-end" } }}>
            <Box sx={{ width: { xs: "100%", sm: 220 } }}>
              <DateTimePicker label="Due Date" value={dueDate} onChange={setDueDate} placeholder="Optional" />
            </Box>
          </Box>
        </InvoiceMetaPanel>

        <Divider sx={{ my: 2, borderColor: "var(--slate-100)" }} />

        {invoice.project && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, bgcolor: "var(--slate-50)", p: 1.5, borderRadius: 2 }}>
            <FolderOpenRoundedIcon fontSize="small" sx={{ color: "var(--slate-500)" }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--slate-700)" }}>
              {invoice.project.project_type} Order
            </Typography>
          </Box>
        )}
      </Paper>

      <ItemLineEditor items={items} onChange={setItems} itemTypeOptions={itemTypeOptions} />

      {rowError && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {rowError}
        </Alert>
      )}
      {discountError && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {discountError}
        </Alert>
      )}
      {submitError && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {submitError}
        </Alert>
      )}

      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: "var(--slate-50)",
            border: "1px solid var(--slate-200)",
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "var(--slate-600)" }}>
            <DiscountRoundedIcon fontSize="small" />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Discount Amount
            </Typography>
          </Box>
          <Box sx={{ width: 140 }}>
            <TextField
              type="number"
              placeholder="0.00"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
              sx={numberFieldSx}
              slotProps={{
                input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> },
              }}
            />
          </Box>
        </Paper>
      </Box>

      <Box sx={{ mb: 4 }}>
        <InvoiceTotalCard
          subtotal={grandTotal}
          discountAmount={toNumber(discountAmount)}
          advanceAmount={invoice.advance_amount}
          paymentMethod={invoice.payment_method}
        />
      </Box>

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, pt: 2, borderTop: "1px solid var(--slate-200)" }}>
        <MuiButton
          onClick={closeDialog}
          disabled={submitting}
          sx={{ color: "var(--slate-500)", textTransform: "none", fontWeight: 600, px: 3, "&:hover": { bgcolor: "var(--slate-100)" } }}
        >
          Cancel
        </MuiButton>
        <Button onClick={handleSave} disabled={submitting} variant="contained">
          {submitting ? "Saving..." : "Save Changes"}
        </Button>
      </Box>
    </Box>
  );
}
