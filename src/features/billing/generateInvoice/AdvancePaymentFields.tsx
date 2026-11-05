import { Box, InputAdornment } from "@mui/material";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import { PAYMENT_METHODS } from "../../../domain/paymentMethods";
import Dropdown from "../../../ui/Dropdown";
import { InvoicePanelLabel } from "../../../ui/InvoiceDocument";
import TextField from "../../../ui/TextField";
import { numberFieldSx, textFieldSx } from "./fieldStyles";

// Money already taken for this job: how much, how it was paid, and any reference.
export default function AdvancePaymentFields({
  amount,
  method,
  reference,
  onAmountChange,
  onMethodChange,
  onReferenceChange,
}: {
  amount: string;
  method: string;
  reference: string;
  onAmountChange: (value: string) => void;
  onMethodChange: (value: string) => void;
  onReferenceChange: (value: string) => void;
}) {
  return (
    <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
      <Box sx={{ p: 1, bgcolor: "var(--slate-100)", borderRadius: 1.5, color: "var(--slate-600)", mt: 0.5 }}>
        <PaymentsRoundedIcon fontSize="small" />
      </Box>
      <Box sx={{ flex: 1 }}>
        <InvoicePanelLabel>Advance Payment (optional)</InvoicePanelLabel>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mt: 1 }}>
          <Box sx={{ width: 140 }}>
            <TextField
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              sx={numberFieldSx}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">₹</InputAdornment>
                  ),
                },
              }}
            />
          </Box>
          <Box sx={{ width: 180 }}>
            <Dropdown
              placeholder="Payment method"
              options={PAYMENT_METHODS}
              value={method || undefined}
              onChange={(v) => onMethodChange((v as string) || "")}
            />
          </Box>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <TextField
              placeholder="Reference / note (optional)"
              value={reference}
              onChange={(e) => onReferenceChange(e.target.value)}
              sx={textFieldSx}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
