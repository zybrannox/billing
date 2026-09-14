import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, CircularProgress, IconButton, Tooltip } from "@mui/material";
import FolderOpenRoundedIcon from "@mui/icons-material/FolderOpenRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";

import { apiService } from "../../api/service";
import { formatDateTime } from "../../utils/dateFormatter";
import { getSemanticColor } from "../../utils/colors";
import { useDialogStore } from "../../store/useDialogStore";
import { shareInvoiceToWhatsApp } from "../../utils/shareInvoiceToWhatsApp";
import Chip from "../../ui/Chip";
import { semanticChipSx } from "../../ui/chipStyles";
import CrudActions from "../../ui/Actions";

interface InvoiceRow {
  id: number;
  invoice_number: string;
  project_type: string | null;
  // A customer's invoices often share the same project_type ("Flex" for
  // every banner job) - the description is what actually distinguishes
  // one job from another at a glance (see entities/invoice.py's
  // project_description property).
  project_description: string | null;
  amount: number;
  balance_due: number;
  status: "pending" | "paid" | "cancelled";
  created_at: string;
}

interface InvoiceListResponse {
  items: InvoiceRow[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

const money = (v: number) => `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

// A page at a time, not the customer's whole invoice history - this panel
// is a quick peek from the Customers list (see Customers.tsx's
// renderDetailPanel), not the full record. Fetches lazily: Table only
// mounts this component for whichever single row is actually expanded
// (see Table.tsx's accordion - true for one row at a time, nothing pre-
// fetched for the rest of the page), so opening this costs one small,
// paginated request regardless of how many invoices the customer has on
// file or how many other customers are in the list. The backend orders
// pending invoices first (see app/invoices/repository.py's
// _INVOICE_STATUS_RANK) - the ones that still need attention surface on
// page 1 rather than being buried under settled ones by recency alone.
const PAGE_SIZE = 10;

export default function CustomerInvoicesList({ customerId }: { customerId: number }) {
  const navigate = useNavigate();
  const { openDialog } = useDialogStore();
  // `invoices === null` doubles as the loading flag instead of a separate
  // boolean set synchronously at the top of the effect (a cascading-render
  // footgun the lint rule below specifically exists to catch) - the
  // cleanup function resets it to null right before the *next* effect run
  // starts (when customerId/page changes), which is the recommended place
  // to unwind an in-flight effect's state rather than the new run's own
  // body.
  const [invoices, setInvoices] = useState<InvoiceRow[] | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    apiService
      .get<InvoiceListResponse>("/invoices/", {
        params: { customer_id: customerId, page, page_size: PAGE_SIZE },
      })
      .then((res) => {
        if (!active) return;
        setInvoices(res.items);
        setTotalPages(res.total_pages || 1);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
      setInvoices(null);
      setError(false);
    };
  }, [customerId, page]);

  const loading = invoices === null && !error;

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
        <CircularProgress size={22} thickness={5} />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography variant="body2" sx={{ color: "var(--red-600)", py: 1.5, textAlign: "center" }}>
        Couldn't load invoices for this customer.
      </Typography>
    );
  }

  if (!invoices || invoices.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1.5, textAlign: "center" }}>
        No invoices raised yet.
      </Typography>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
      {invoices.map((inv) => (
        <Box
          key={inv.id}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            px: 1.5,
            py: 1,
            borderRadius: 2,
            bgcolor: "var(--white)",
            border: "1px solid var(--slate-200)",
          }}
        >
          <ReceiptLongRoundedIcon fontSize="small" sx={{ color: "var(--slate-400)", flexShrink: 0 }} />

          <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--slate-800)", width: 140, flexShrink: 0 }}>
            {inv.invoice_number}
          </Typography>

          <Tooltip
            title={inv.project_type && inv.project_description ? `${inv.project_type} — ${inv.project_description}` : ""}
          >
            <Box sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 0.5 }}>
              <FolderOpenRoundedIcon sx={{ fontSize: "0.95rem", color: "var(--slate-400)", flexShrink: 0 }} />
              <Typography variant="body2" color="text.secondary" noWrap>
                {inv.project_type || "—"}
                {inv.project_description ? ` — ${inv.project_description}` : ""}
              </Typography>
            </Box>
          </Tooltip>

          <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--slate-700)", width: 90, textAlign: "right", flexShrink: 0 }}>
            {money(inv.amount)}
          </Typography>

          <Box sx={{ width: 110, flexShrink: 0 }}>
            <Chip
              label={inv.status}
              sx={semanticChipSx(
                getSemanticColor(
                  "printStatus",
                  inv.status === "paid" ? "Completed" : inv.status === "pending" ? "In Progress" : "Delayed",
                ),
              )}
            />
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ width: 100, flexShrink: 0 }}>
            {formatDateTime(inv.created_at)}
          </Typography>

          <CrudActions
            viewInvoice
            onViewInvoice={() => openDialog("viewInvoice", inv.id, "view")}
            shareInvoice
            onShareInvoice={() =>
              shareInvoiceToWhatsApp(inv.id).catch((err) =>
                console.error("Failed to share invoice to WhatsApp", err),
              )
            }
            size="small"
          />
        </Box>
      ))}

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pt: 0.5 }}>
        {totalPages > 1 ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Tooltip title="Previous page">
              <span>
                <IconButton size="small" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeftRoundedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Typography variant="caption" color="text.secondary">
              Page {page} of {totalPages}
            </Typography>
            <Tooltip title="Next page">
              <span>
                <IconButton size="small" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRightRoundedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        ) : (
          <Box />
        )}

        <Box
          component="button"
          type="button"
          onClick={() => navigate(`/admin/customers/${customerId}?tab=billing`)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            border: "none",
            background: "none",
            padding: 0,
            cursor: "pointer",
            color: "var(--blue-600)",
            fontSize: "0.8125rem",
            fontWeight: 700,
            fontFamily: "inherit",
            "&:hover": { textDecoration: "underline" },
          }}
        >
          View Full Billing History
          <ArrowForwardRoundedIcon sx={{ fontSize: "0.9rem" }} />
        </Box>
      </Box>
    </Box>
  );
}
