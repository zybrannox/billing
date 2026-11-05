import { Box, Typography } from "@mui/material";
import type { Invoice } from "../../../api/types";
import { formatDate } from "../../../format/date";
import { formatRupees } from "../../../format/money";
import InvoiceStatusChip from "../InvoiceStatusChip";

// Invoices as compact rows: down the left beside an open invoice, and as the
// whole list on a phone, where a wide table would have to scroll sideways.
export default function InvoiceRows({
  invoices,
  selectedId,
  onOpen,
}: {
  invoices: Invoice[];
  selectedId?: number | null;
  onOpen: (id: number) => void;
}) {
  return (
    <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
      {invoices.map((invoice) => {
        const selected = invoice.id === selectedId;
        return (
          <Box component="li" key={invoice.id} sx={{ "& + &": { borderTop: "1px solid var(--slate-100)" } }}>
            <Box
              component="button"
              type="button"
              aria-current={selected ? "true" : undefined}
              onClick={() => onOpen(invoice.id)}
              sx={{
                display: "block",
                width: "100%",
                px: 1.5,
                py: 1,
                border: "none",
                font: "inherit",
                textAlign: "left",
                cursor: "pointer",
                bgcolor: selected ? "var(--blue-50)" : "transparent",
                boxShadow: selected ? "inset 3px 0 0 var(--blue-600)" : "none",
                "&:hover": { bgcolor: selected ? "var(--blue-50)" : "var(--slate-50)" },
                "&:focus-visible": { outline: "2px solid var(--blue-500)", outlineOffset: -2 },
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                <Typography noWrap sx={{ fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--slate-900)", minWidth: 0 }}>
                  {invoice.customer_name ?? "No customer"}
                </Typography>
                <Typography sx={{ fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--slate-900)", flexShrink: 0 }}>{formatRupees(invoice.amount)}</Typography>
              </Box>
              <Typography noWrap sx={{ fontSize: "var(--fs-xs)", color: "var(--slate-500)" }}>
                {invoice.invoice_number} · {formatDate(invoice.created_at)}
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <InvoiceStatusChip invoice={invoice} />
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
