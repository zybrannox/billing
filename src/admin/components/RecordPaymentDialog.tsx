import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { GenericDialog } from "../../ui/Dialog";
import Button from "../../ui/Button";
import Loader from "../../ui/Loader";
import Dropdown from "../../ui/Dropdown";
import TextField from "../../ui/TextField";
import { apiService } from "../../api/service";
import { getApiErrorMessage } from "../../utils/apiError";

const PAYMENT_METHODS = ["Cash", "UPI", "Bank Transfer", "Card", "Cheque", "Other"];

const money = (v: number) => `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export interface RecordPaymentTarget {
  id: number;
  invoice_number: string;
  amount: number;
  balance_due: number;
}

// Records one instalment against a pending invoice (PATCH
// /invoices/{id}/record-payment). The amount defaults to the full balance,
// so settling in one go is still a single confirm; typing less records a
// partial payment and leaves the invoice pending with a smaller balance.
// Mounted only while `invoice` is set, so its form state starts fresh for
// every invoice it's opened on.
export default function RecordPaymentDialog({
  invoice,
  onClose,
  onRecorded,
}: {
  invoice: RecordPaymentTarget | null;
  onClose: () => void;
  onRecorded: () => void;
}) {
  return (
    <GenericDialog open={invoice !== null} onClose={onClose} title="Record Payment" width="26rem">
      {invoice && <RecordPaymentForm invoice={invoice} onClose={onClose} onRecorded={onRecorded} />}
    </GenericDialog>
  );
}

function RecordPaymentForm({
  invoice,
  onClose,
  onRecorded,
}: {
  invoice: RecordPaymentTarget;
  onClose: () => void;
  onRecorded: () => void;
}) {
  const [amount, setAmount] = useState(String(invoice.balance_due));
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const value = Number(amount);
  const amountError =
    !amount || Number.isNaN(value) || value <= 0
      ? "Enter an amount greater than 0"
      : value > invoice.balance_due
        ? `Can't exceed the balance due (${money(invoice.balance_due)})`
        : "";
  const remaining = amountError ? invoice.balance_due : Math.round((invoice.balance_due - value) * 100) / 100;

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      await apiService.patch(`/invoices/${invoice.id}/record-payment`, {
        amount: value,
        payment_method: method,
        payment_reference: reference.trim() || undefined,
      });
      onRecorded();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't record the payment. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.75 }}>
      <Typography sx={{ fontSize: "0.875rem", color: "var(--slate-500)", lineHeight: 1.5 }}>
        {invoice.invoice_number} · Total {money(invoice.amount)} · Balance due{" "}
        <b style={{ color: "var(--slate-800)" }}>{money(invoice.balance_due)}</b>
      </Typography>

      <TextField
        label="Amount received (₹)"
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        error={!!amountError}
        helperText={amountError || (remaining === 0 ? "This settles the invoice in full." : `${money(remaining)} will remain due.`)}
        disabled={saving}
      />

      <Dropdown
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
      />

      {error && (
        <Typography
          sx={{
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: "var(--rose-600)",
            bgcolor: "rgba(225, 29, 72, 0.06)",
            borderRadius: "8px",
            p: 1.25,
          }}
        >
          {error}
        </Typography>
      )}

      <div className="flex justify-end gap-2.5">
        <Button variantColor="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={saving || !!amountError || !method} sx={{ minWidth: 120 }}>
          {saving ? <Loader /> : "Record Payment"}
        </Button>
      </div>
    </Box>
  );
}
