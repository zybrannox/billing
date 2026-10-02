import { useState } from "react";
import { Box, CircularProgress, IconButton, Popover, Tooltip, Typography } from "@mui/material";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import { apiService } from "../../api/service";
import { formatDateTime } from "../../utils/dateFormatter";

interface Payment {
  id: number;
  amount: number;
  payment_method: string | null;
  payment_reference: string | null;
  paid_at: string;
  recorded_by: string | null;
}

const money = (v: number) =>
  `${v < 0 ? "−" : ""}₹${Math.abs(v).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

// An icon button that lists every payment recorded against one invoice
// (GET /invoices/{id}/payments) in a popover, fetched fresh each time it's
// opened. Meant for an invoice card's footer; the wrapper stops click
// propagation (React bubbles events from the popover's portal back up to
// its parent) so using it inside a clickable card never also opens the card.
export default function PaymentHistory({ invoiceId }: { invoiceId: number }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [failed, setFailed] = useState(false);

  const open = (e: React.MouseEvent<HTMLElement>) => {
    setAnchor(e.currentTarget);
    setPayments(null);
    setFailed(false);
    apiService
      .get<Payment[]>(`/invoices/${invoiceId}/payments`)
      .then(setPayments)
      .catch(() => setFailed(true));
  };

  const received = (payments ?? []).reduce((sum, p) => sum + p.amount, 0);

  return (
    <Box onClick={(e) => e.stopPropagation()} sx={{ display: "flex" }}>
      <Tooltip title="Payment history">
        <IconButton
          size="small"
          onClick={open}
          aria-label="Payment history"
          sx={{
            color: "var(--slate-600)",
            backgroundColor: "rgba(100, 116, 139, 0.08)",
            borderRadius: "8px",
            "&:hover": { backgroundColor: "rgba(100, 116, 139, 0.16)" },
          }}
        >
          <HistoryRoundedIcon sx={{ fontSize: "1.125rem" }} />
        </IconButton>
      </Tooltip>

      <Popover
        open={anchor !== null}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{ paper: { sx: { width: 340, maxWidth: "calc(100vw - 32px)", mt: -1, p: 2, borderRadius: 3 } } }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 1 }}>
          <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", color: "var(--slate-500)" }}>
            PAYMENT HISTORY
          </Typography>
          {payments && payments.length > 0 && (
            <Typography variant="caption" color="text.secondary">
              Received <b style={{ color: "var(--slate-800)" }}>{money(received)}</b>
            </Typography>
          )}
        </Box>

        {failed ? (
          <Typography variant="body2" sx={{ color: "var(--red-600)", py: 1 }}>
            Couldn't load payments.
          </Typography>
        ) : payments === null ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <CircularProgress size={20} thickness={5} />
          </Box>
        ) : payments.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            No payments recorded yet.
          </Typography>
        ) : (
          <Box sx={{ maxHeight: 320, overflowY: "auto" }}>
            {payments.map((p, i) => (
              <Box
                key={p.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 2,
                  py: 1,
                  borderTop: i === 0 ? "none" : "1px solid var(--slate-100)",
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--slate-800)" }}>
                    {p.amount < 0 ? "Adjustment" : p.payment_method || "Payment"}
                    {p.payment_reference ? ` · ${p.payment_reference}` : ""}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDateTime(p.paid_at)}
                    {p.recorded_by ? ` · ${p.recorded_by}` : ""}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, flexShrink: 0, color: p.amount < 0 ? "var(--rose-600)" : "var(--emerald-600)" }}
                >
                  {money(p.amount)}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Popover>
    </Box>
  );
}
