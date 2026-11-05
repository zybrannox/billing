import { useState } from "react";
import { Button as MuiButton, IconButton, Menu, MenuItem, Tooltip } from "@mui/material";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import type { InvoiceDetail } from "../../../api/types";
import { messages } from "../../../messages";
import { useAppStore } from "../../../store/useAppStore";
import RecordPaymentDialog from "../RecordPaymentDialog";
import { useInvoiceActions } from "../useInvoiceActions";

// Record a payment, mark paid, and (for admins) cancel: what you'd do next with
// an unpaid invoice, beside its Print and Download buttons.
export default function PaymentActions({ invoice, onChanged }: { invoice: InvoiceDetail; onChanged: () => void }) {
  const isAdmin = useAppStore((s) => s.user?.role === "admin");
  const { markPaid, cancel, paymentTarget, setPaymentTarget } = useInvoiceActions(onChanged);
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);
  if (invoice.status !== "pending") return null;
  return (
    <>
      <RecordPaymentDialog invoice={paymentTarget} onClose={() => setPaymentTarget(null)} onRecorded={onChanged} />
      <MuiButton
        variant="outlined"
        startIcon={<PaymentsRoundedIcon />}
        onClick={() =>
          setPaymentTarget({ id: invoice.id, invoice_number: invoice.invoice_number, amount: invoice.amount, balance_due: invoice.balance_due })
        }
        sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, color: "var(--slate-700)", borderColor: "var(--slate-300)", whiteSpace: "nowrap" }}
      >
        {messages.actions.invoice.recordPayment}
      </MuiButton>
      <MuiButton
        variant="outlined"
        onClick={() => markPaid(invoice.id)}
        sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, color: "var(--slate-700)", borderColor: "var(--slate-300)", whiteSpace: "nowrap" }}
      >
        {messages.actions.invoice.markPaid}
      </MuiButton>
      {isAdmin && (
        <>
          <Tooltip title="More">
            <IconButton aria-label="More actions" onClick={(e) => setMoreAnchor(e.currentTarget)} sx={{ border: "1px solid var(--slate-200)", borderRadius: 2, color: "var(--slate-700)" }}>
              <MoreHorizRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Menu anchorEl={moreAnchor} open={!!moreAnchor} onClose={() => setMoreAnchor(null)}>
            <MenuItem
              onClick={() => {
                setMoreAnchor(null);
                cancel(invoice.id, invoice.invoice_number);
              }}
              sx={{ color: "var(--red-600)", fontSize: "var(--fs-sm)" }}
            >
              {messages.actions.invoice.cancel}
            </MenuItem>
          </Menu>
        </>
      )}
    </>
  );
}
