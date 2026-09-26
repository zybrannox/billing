import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, CircularProgress, IconButton, Tooltip } from "@mui/material";
import FolderOpenRoundedIcon from "@mui/icons-material/FolderOpenRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
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

interface InvoiceRow {
  id: number;
  invoice_number: string;
  // A single customer's own peek panel (see CustomerInvoicesList.tsx)
  // never needs this - it's always the same person. A company's invoices
  // span every contact under it, so this is what actually distinguishes
  // one row from another here.
  customer_name: string | null;
  project_type: string | null;
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

// Two contexts share this component (via `mode`) rather than duplicating
// it: a quick "peek" from the Companies list's row accordion (see
// Companies.tsx's renderDetailPanel), and the "full" consolidated
// Billing tab on a company's own profile page (see CompanyProfile.tsx) -
// both just filter the same GET /invoices/?company_id=X (see
// app/invoices/repository.py's get_all_invoices) at a different page
// size. The backend orders pending invoices first (see
// app/invoices/repository.py's _INVOICE_STATUS_RANK), same as the
// customer-scoped list.
export default function CompanyInvoicesList({
  companyId,
  mode,
}: {
  companyId: number;
  mode: "peek" | "full";
}) {
  const navigate = useNavigate();
  const { openDialog } = useDialogStore();
  const { showDialog } = useConfirmDialogStore();
  const { updateInvoice } = useInvoiceStore();
  const pageSize = mode === "peek" ? 10 : 20;
  // `invoices === null` doubles as the loading flag - see
  // CustomerInvoicesList.tsx's identical pattern/comment for why (a
  // react-hooks/set-state-in-effect footgun this avoids).
  const [invoices, setInvoices] = useState<InvoiceRow[] | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState(false);

  // Extracted (not inlined in the effect below) so handleMarkPaid/
  // handleCancel can also call it directly to refresh this panel in place
  // after an action - same pattern CustomerInvoicesList.tsx uses.
  const load = () => {
    let active = true;
    apiService
      .get<InvoiceListResponse>("/invoices/", {
        params: { company_id: companyId, page, page_size: pageSize },
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
  }, [companyId, page, pageSize]);

  // Same dedicated PATCH /invoices/{id}/mark-paid flow as
  // CustomerInvoicesList.tsx/CustomerProfile.tsx - see those files' own
  // comments for why this can't be the generic updateInvoice({status:
  // "paid"}) call. Company-linked invoices had no way to be marked paid or
  // cancelled from any UI surface until this fix.
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
        Couldn't load invoices for this company.
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

          <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--slate-800)", width: 130, flexShrink: 0 }}>
            {inv.invoice_number}
          </Typography>

          <Tooltip title={inv.customer_name || ""}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, width: 130, flexShrink: 0 }}>
              <PersonRoundedIcon sx={{ fontSize: "0.95rem", color: "var(--slate-400)", flexShrink: 0 }} />
              <Typography variant="body2" color="text.secondary" noWrap>
                {inv.customer_name || "—"}
              </Typography>
            </Box>
          </Tooltip>

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
              shareInvoiceToWhatsApp(inv.id).catch((err) => {
                console.error("Failed to share invoice to WhatsApp", err);
                handleShareFailed();
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
      ))}

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: mode === "peek" ? "space-between" : "flex-end", pt: 0.5 }}>
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
          mode === "peek" && <Box />
        )}

        {mode === "peek" && (
          <Box
            component="button"
            type="button"
            onClick={() => navigate(`/admin/companies/${companyId}?tab=billing`)}
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
        )}
      </Box>
    </Box>
  );
}
