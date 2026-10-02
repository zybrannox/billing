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
import { useConfirmDialogStore } from "../../hooks/useconfirmDialogStore";
import { useInvoiceStore } from "../../store/useInvoiceStore";
import { shareInvoiceToWhatsApp } from "../../utils/shareInvoiceToWhatsApp";
import Chip from "../../ui/Chip";
import { semanticChipSx } from "../../ui/chipStyles";
import CrudActions from "../../ui/Actions";
import PaymentHistory from "./PaymentHistory";
import RecordPaymentDialog, { type RecordPaymentTarget } from "./RecordPaymentDialog";

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
  const { showDialog } = useConfirmDialogStore();
  const { updateInvoice } = useInvoiceStore();
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
  const [paymentTarget, setPaymentTarget] = useState<RecordPaymentTarget | null>(null);

  // Extracted (not inlined in the effect below) so handleMarkPaid/
  // handleCancel can also call it directly to refresh this panel in place
  // after an action, the same "named load function" pattern CustomerProfile.tsx
  // uses for its own reasons (avoids the set-state-in-effect lint rule).
  const load = () => {
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
    };
  };

  useEffect(() => {
    const cancel = load();
    return () => {
      cancel();
      setInvoices(null);
      setError(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, page]);

  // Goes through the dedicated PATCH /invoices/{id}/mark-paid endpoint
  // (see app/invoices/service.py's service_mark_paid), same as
  // CustomerProfile.tsx's Billing tab and DeliveryCheck.tsx's "Complete
  // Payment" panel - never the generic updateInvoice({status: "paid"}),
  // which never touches advance_amount and would leave a stale nonzero
  // balance_due on an invoice every aggregate (Dashboard, this same
  // Customers list's payment_status chip) has already stopped counting as
  // outstanding the moment status flips to "paid".
  const handleMarkPaid = (invoiceId: number) => {
    showDialog({
      title: "Mark Invoice as Paid",
      description: "This records the invoice as paid in full. How was it paid?",
      confirmText: "Mark as Paid",
      paymentMethodRequired: true,
      onConfirm: async (paymentMethod) => {
        await apiService.patch(`/invoices/${invoiceId}/mark-paid`, {
          payment_method: paymentMethod,
        });
        load();
      },
    });
  };

  const handleCancel = async (invoiceId: number) => {
    await updateInvoice(invoiceId, { status: "cancelled" });
    load();
  };

  const handleShareFailed = () => {
    showDialog({
      title: "Couldn't share invoice",
      description: "Something went wrong preparing the WhatsApp share link. Please try again.",
      confirmText: "OK",
    });
  };

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
    <>
    <RecordPaymentDialog
      invoice={paymentTarget}
      onClose={() => setPaymentTarget(null)}
      onRecorded={load}
    />
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
      {invoices.map((inv) => (
        <Box
          key={inv.id}
          role="button"
          tabIndex={0}
          onClick={() => openDialog("viewInvoice", inv.id, "view")}
          onKeyDown={(e) => {
            if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              openDialog("viewInvoice", inv.id, "view");
            }
          }}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 0.75,
            px: 1.5,
            py: 1.25,
            borderRadius: 2,
            bgcolor: "var(--white)",
            border: "1px solid var(--slate-200)",
            cursor: "pointer",
            transition: "border-color 0.15s ease, box-shadow 0.15s ease",
            "&:hover": { borderColor: "var(--blue-300)", boxShadow: "0 1px 6px rgba(37, 99, 235, 0.10)" },
            "&:focus-visible": { outline: "2px solid var(--blue-500)", outlineOffset: 1 },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ReceiptLongRoundedIcon fontSize="small" sx={{ color: "var(--slate-400)", flexShrink: 0 }} />
            <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--slate-800)", flex: 1, minWidth: 0 }} noWrap>
              {inv.invoice_number}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--slate-800)", flexShrink: 0 }}>
              {money(inv.amount)}
            </Typography>
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

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
            <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
              {formatDateTime(inv.created_at)}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
              <PaymentHistory invoiceId={inv.id} />
              <Typography variant="caption" sx={{ color: "var(--amber-700)", fontWeight: 600 }} noWrap>
                {inv.status === "pending" && inv.balance_due < inv.amount
                  ? `Paid ${money(inv.amount - inv.balance_due)} · ${money(inv.balance_due)} due`
                  : ""}
              </Typography>
            </Box>
            <Box onClick={(e) => e.stopPropagation()}>
            <CrudActions
              shareInvoice
              onShareInvoice={() =>
                shareInvoiceToWhatsApp(inv.id).catch((err) => {
                  console.error("Failed to share invoice to WhatsApp", err);
                  handleShareFailed();
                })
              }
              recordPayment
              onRecordPayment={() =>
                setPaymentTarget({
                  id: inv.id,
                  invoice_number: inv.invoice_number,
                  amount: inv.amount,
                  balance_due: inv.balance_due,
                })
              }
              markPaid
              cancelInvoice
              invoiceStatus={inv.status}
              onMarkPaid={() => handleMarkPaid(inv.id)}
              onCancelInvoice={() => handleCancel(inv.id)}
              size="small"
            />
            </Box>
          </Box>
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
    </>
  );
}
