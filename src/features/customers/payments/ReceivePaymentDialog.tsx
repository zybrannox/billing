import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, InputAdornment, TextField as MuiTextField, Typography } from "@mui/material";
import { apiService } from "../../../api/service";
import type { CustomerPayment, OpenInvoice } from "../../../api/types";
import { PAYMENT_METHODS } from "../../../domain/paymentMethods";
import { formatDate } from "../../../format/date";
import { formatRupees as money } from "../../../format/money";
import Button from "../../../ui/Button";
import { GenericDialog } from "../../../ui/Dialog";
import Dropdown from "../../../ui/Dropdown";
import ListState from "../../../ui/ListState";
import Loader from "../../../ui/Loader";
import TextField from "../../../ui/TextField";
import { getApiErrorMessage } from "../../../utils/apiError";
import { useInvalidateBilling } from "../../billing/queries";
import { asText, autoAllocate, checkSplit, toAllocations } from "./allocation";
import { paymentKeys } from "./paymentKeys";


// Today's date as the date input wants it, in the user's own timezone.
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Money a customer paid in one go, split across their unpaid invoices (oldest
 * first, every share editable). Whatever isn't split stays with them as credit.
 * With `credit` set it instead spends what's left of an earlier payment.
 */
export default function ReceivePaymentDialog({
  open,
  onClose,
  customerId,
  customerName,
  credit,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  customerId: number;
  customerName: string;
  credit?: CustomerPayment | null;
  onSaved: () => void;
}) {
  return (
    <GenericDialog
      open={open}
      onClose={onClose}
      title={credit ? "Use credit" : "Receive payment"}
      subtitle={credit ? `${money(credit.unused)} left from the ${formatDate(credit.received_at)} payment · ${customerName}` : customerName}
      width="46rem"
    >
      {open && <PaymentForm customerId={customerId} credit={credit ?? null} onClose={onClose} onSaved={onSaved} />}
    </GenericDialog>
  );
}

function PaymentForm({
  customerId,
  credit,
  onClose,
  onSaved,
}: {
  customerId: number;
  credit: CustomerPayment | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const client = useQueryClient();
  const invalidateBilling = useInvalidateBilling();
  const openInvoices = useQuery({
    queryKey: paymentKeys.open(customerId),
    queryFn: () => apiService.get<OpenInvoice[]>(`/customers/${customerId}/open-invoices`),
  });
  const invoices = useMemo(() => openInvoices.data ?? [], [openInvoices.data]);

  const [amountText, setAmountText] = useState(credit ? String(credit.unused) : "");
  const [date, setDate] = useState(today);
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  // Shares as typed. Until someone edits one, they follow the amount (oldest first).
  const [typed, setTyped] = useState<Record<number, string> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const amount = Number(amountText);
  const amountValid = amountText.trim() !== "" && Number.isFinite(amount) && amount > 0;
  const shares = typed ?? asText(autoAllocate(amountValid ? amount : 0, invoices));
  const split = checkSplit(amountValid ? amount : 0, invoices, shares);
  const owed = invoices.reduce((sum, i) => sum + i.balance_due, 0);

  const setShare = (id: number, value: string) => setTyped({ ...shares, [id]: value });
  const payInFull = (invoice: OpenInvoice) => {
    const others = split.applied - (Number(shares[invoice.id]) || 0);
    const room = Math.max(0, Math.round((amount - others) * 100) / 100);
    setShare(invoice.id, String(Math.min(invoice.balance_due, room)));
  };

  const dateError = !credit && date > today() ? "Can't be in the future" : "";
  const amountError = credit ? "" : amountText && !amountValid ? "Enter an amount greater than 0" : "";
  const canSave =
    !saving &&
    amountValid &&
    !split.error &&
    !dateError &&
    (credit ? split.applied > 0 : !!method);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const allocations = toAllocations(invoices, shares);
      if (credit) {
        await apiService.post(`/customer-payments/${credit.id}/apply`, { allocations });
      } else {
        await apiService.post(`/customers/${customerId}/payments`, {
          amount,
          payment_method: method,
          payment_reference: reference.trim() || undefined,
          note: note.trim() || undefined,
          // Today means "now"; an earlier day is kept as that day (midday, so no
          // timezone can push it onto the day before).
          received_at: date === today() ? undefined : new Date(`${date}T12:00:00`).toISOString(),
          allocations,
        });
      }
      await Promise.all([
        client.invalidateQueries({ queryKey: paymentKeys.list(customerId) }),
        client.invalidateQueries({ queryKey: paymentKeys.open(customerId) }),
        client.invalidateQueries({ queryKey: ["customer-statement", customerId] }),
        invalidateBilling(),
      ]);
      onSaved();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't save the payment. Please try again."));
      // The invoices may have changed under us (someone else paid one).
      client.invalidateQueries({ queryKey: paymentKeys.open(customerId) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {!credit && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
          <TextField
            label="Amount received (₹)"
            type="number"
            value={amountText}
            onChange={(e) => {
              setAmountText(e.target.value);
              setTyped(null);
            }}
            error={!!amountError}
            helperText={amountError || (owed > 0 ? `${money(owed)} owed across ${invoices.length} unpaid invoice${invoices.length === 1 ? "" : "s"}` : " ")}
            disabled={saving}
            autoFocus
            slotProps={{ htmlInput: { min: 0, step: "0.01", inputMode: "decimal" } }}
          />
          <TextField
            label="Date received"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            error={!!dateError}
            helperText={dateError || " "}
            disabled={saving}
            slotProps={{ htmlInput: { max: today() }, inputLabel: { shrink: true } }}
          />
          <Dropdown
            label="Payment method"
            placeholder="How was this paid?"
            options={PAYMENT_METHODS}
            value={method || undefined}
            onChange={(v) => setMethod((v as string) || "")}
            disabled={saving}
          />
          <TextField
            label="Reference (optional)"
            placeholder="UPI ref, cheque no., etc."
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            disabled={saving}
            slotProps={{ htmlInput: { maxLength: 100 } }}
          />
          <TextField
            label="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={saving}
            slotProps={{ htmlInput: { maxLength: 500 } }}
            sx={{ gridColumn: { sm: "1 / -1" } }}
          />
        </Box>
      )}

      <Box>
        <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 1, mb: 1 }}>
          <Typography sx={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--slate-700)" }}>Apply to invoices</Typography>
          {invoices.length > 0 && (
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <LinkButton onClick={() => setTyped(null)} disabled={saving || typed === null}>
                Oldest first
              </LinkButton>
              <LinkButton onClick={() => setTyped({})} disabled={saving}>
                Clear
              </LinkButton>
            </Box>
          )}
        </Box>

        {openInvoices.isPending || openInvoices.isError ? (
          <ListState loading={openInvoices.isPending} error={openInvoices.isError} empty={false} errorText="Couldn't load the invoices." emptyText="" />
        ) : invoices.length === 0 ? (
          <Typography sx={{ fontSize: "var(--fs-sm)", color: "var(--slate-500)", p: 2, textAlign: "center", border: "1px dashed var(--slate-200)", borderRadius: "10px" }}>
            Nothing is owed right now. {credit ? "" : "The whole amount will be kept as credit for their next invoice."}
          </Typography>
        ) : (
          <Box sx={{ border: "1px solid var(--slate-200)", borderRadius: "10px", overflow: "hidden", maxHeight: 320, overflowY: "auto" }}>
            {invoices.map((invoice, index) => {
              const shareError = split.invoiceErrors[invoice.id];
              const share = Number(shares[invoice.id]) || 0;
              return (
                <Box
                  key={invoice.id}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr 128px", sm: "minmax(0, 1fr) 110px 150px" },
                    alignItems: "center",
                    gap: 1.5,
                    px: 1.5,
                    py: 1,
                    borderTop: index ? "1px solid var(--slate-100)" : "none",
                    bgcolor: share > 0 ? "var(--blue-50)" : "transparent",
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--slate-800)" }}>
                      {invoice.invoice_number ?? `Invoice #${invoice.id}`}
                    </Typography>
                    <Typography noWrap sx={{ fontSize: "var(--fs-xs)", color: "var(--slate-500)" }}>
                      {formatDate(invoice.created_at)}
                      {invoice.job ? ` · ${invoice.job}` : ""}
                      <Box component="span" sx={{ display: { sm: "none" } }}>{` · owes ${money(invoice.balance_due)}`}</Box>
                    </Typography>
                  </Box>
                  <Box sx={{ display: { xs: "none", sm: "block" }, textAlign: "right" }}>
                    <Typography sx={{ fontSize: "var(--fs-sm)", color: "var(--slate-700)" }}>{money(invoice.balance_due)}</Typography>
                    <LinkButton onClick={() => payInFull(invoice)} disabled={saving || !amountValid}>
                      Pay in full
                    </LinkButton>
                  </Box>
                  <MuiTextField
                    size="small"
                    type="number"
                    aria-label={`Amount for ${invoice.invoice_number ?? invoice.id}`}
                    placeholder="0"
                    value={shares[invoice.id] ?? ""}
                    onChange={(e) => setShare(invoice.id, e.target.value)}
                    error={!!shareError}
                    helperText={shareError}
                    disabled={saving}
                    slotProps={{
                      htmlInput: { min: 0, step: "0.01", inputMode: "decimal", style: { textAlign: "right" } },
                      input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> },
                      formHelperText: { sx: { mx: 0 } },
                    }}
                  />
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          border: "1px solid var(--slate-200)",
          borderRadius: "10px",
          bgcolor: "var(--slate-50)",
        }}
      >
        {[
          { label: credit ? "Credit available" : "Amount received", value: amountValid ? amount : 0 },
          { label: "Applied to invoices", value: split.applied },
          { label: credit ? "Credit left" : "Kept as credit", value: Math.max(0, split.left), tone: split.left < 0 ? "var(--red-600)" : undefined },
        ].map((item, i) => (
          <Box key={item.label} sx={{ px: 1.75, py: 1.25, borderLeft: i ? "1px solid var(--slate-200)" : "none" }}>
            <Typography sx={{ fontSize: "var(--fs-xs)", color: "var(--slate-500)" }}>{item.label}</Typography>
            <Typography sx={{ fontSize: "var(--fs-md)", fontWeight: 700, color: item.tone ?? "var(--slate-800)" }}>{money(item.value)}</Typography>
          </Box>
        ))}
      </Box>

      {(split.error || error) && amountValid && (
        <Typography
          role="alert"
          sx={{ fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--rose-600)", bgcolor: "rgba(225, 29, 72, 0.06)", borderRadius: "8px", p: 1.25 }}
        >
          {error || split.error}
        </Typography>
      )}

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.25 }}>
        <Button variantColor="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={save} disabled={!canSave} sx={{ minWidth: 140 }}>
          {saving ? <Loader /> : credit ? "Apply credit" : "Save payment"}
        </Button>
      </Box>
    </Box>
  );
}

function LinkButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      disabled={disabled}
      sx={{
        p: 0,
        border: "none",
        background: "none",
        font: "inherit",
        fontSize: "var(--fs-xs)",
        fontWeight: 600,
        color: "var(--blue-700)",
        cursor: "pointer",
        "&:disabled": { color: "var(--slate-400)", cursor: "default" },
        "&:not(:disabled):hover": { textDecoration: "underline" },
      }}
    >
      {children}
    </Box>
  );
}
