import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, IconButton, Tooltip } from "@mui/material";
import FolderOpenRoundedIcon from "@mui/icons-material/FolderOpenRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";

import { apiService } from "../../api/service";
import { formatDateTime } from "../../format/date";
import { getSemanticColor } from "../../utils/colors";
import { useDialogStore } from "../../store/useDialogStore";
import { useConfirmDialogStore } from "../../hooks/useconfirmDialogStore";
import { useInvoiceStore } from "./useInvoiceStore";
import { shareInvoiceToWhatsApp } from "./shareInvoiceToWhatsApp";
import Chip from "../../ui/Chip";
import { semanticChipSx } from "../../ui/chipStyles";
import CrudActions from "../../ui/Actions";
import RecordPaymentDialog, { type RecordPaymentTarget } from "./RecordPaymentDialog";
import { formatRupeesWhole as money } from "../../format/money";
import { messages } from "../../messages";
import ListState from "../../ui/ListState";
import { useInvoiceList, useInvalidateBilling } from "./queries";

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
  const [paymentTarget, setPaymentTarget] = useState<RecordPaymentTarget | null>(null);
  const [page, setPage] = useState(1);

  const query = useInvoiceList({ company_id: companyId, page, page_size: pageSize });
  const invoices = query.data?.items ?? null;
  const totalPages = query.data?.total_pages || 1;
  const error = query.isError;
  // After an action on a row: refetch (see queries.ts) instead of patching local state.
  const load = useInvalidateBilling();

  // Same dedicated PATCH /invoices/{id}/mark-paid flow as
  // CustomerInvoicesList.tsx/CustomerProfile.tsx - see those files' own
  // comments for why this can't be the generic updateInvoice({status:
  // "paid"}) call. Company-linked invoices had no way to be marked paid or
  // cancelled from any UI surface until this fix.
  const handleMarkPaid = (invoiceId: number) => {
    showDialog({
      title: "Mark Invoice as Paid",
      description: "This records the invoice as paid in full. How was it paid?",
      confirmText: messages.actions.invoice.markPaid,
      paymentMethodRequired: true,
      onConfirm: async (paymentMethod) => {
        await apiService.patch(`/invoices/${invoiceId}/mark-paid`, {
          payment_method: paymentMethod,
        });
        load();
      },
    });
  };

  // Cancelling is final (an invoice can't leave "cancelled"), so it's
  // confirmed first. A failure shows inside the dialog (see
  // useConfirmDialogStore) and leaves it open to retry.
  const handleCancel = (invoiceId: number, invoiceNumber: string) => {
    showDialog({
      title: "Cancel this invoice?",
      description: `${invoiceNumber} will be marked as cancelled. This can't be undone.`,
      confirmText: messages.actions.invoice.cancel,
      cancelText: "Keep Invoice",
      isDestructive: true,
      onConfirm: async () => {
        await updateInvoice(invoiceId, { status: "cancelled" });
        load();
      },
    });
  };

  const handleShareFailed = () => {
    showDialog({
      title: "Couldn't share invoice",
      description: "Something went wrong preparing the WhatsApp share link. Please try again.",
      confirmText: "OK",
    });
  };

  if (invoices === null || error || invoices.length === 0) {
    return (
      <ListState
        loading={invoices === null && !error}
        error={error}
        empty={!error && invoices?.length === 0}
        errorText={"Couldn't load invoices for this company."}
        emptyText={messages.empty.invoices}
      />
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
              <PersonRoundedIcon sx={{ fontSize: "var(--fs-xl)", color: "var(--slate-400)", flexShrink: 0 }} />
              <Typography variant="body2" color="text.secondary" noWrap>
                {inv.customer_name || "—"}
              </Typography>
            </Box>
          </Tooltip>

          <Tooltip
            title={inv.project_type && inv.project_description ? `${inv.project_type} — ${inv.project_description}` : ""}
          >
            <Box sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 0.5 }}>
              <FolderOpenRoundedIcon sx={{ fontSize: "var(--fs-xl)", color: "var(--slate-400)", flexShrink: 0 }} />
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
                getSemanticColor("invoiceStatus", inv.status),
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
            onCancelInvoice={() => handleCancel(inv.id, inv.invoice_number)}
            size="small"
          />
        </Box>
      ))}

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: mode === "peek" ? "space-between" : "flex-end", pt: 0.5 }}>
        {totalPages > 1 ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Tooltip title={messages.common.previousPage}>
              <span>
                <IconButton size="small" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeftRoundedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Typography variant="caption" color="text.secondary">
              Page {page} of {totalPages}
            </Typography>
            <Tooltip title={messages.common.nextPage}>
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
              fontSize: "var(--fs-sm)",
              fontWeight: 700,
              fontFamily: "inherit",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            View Full Billing History
            <ArrowForwardRoundedIcon sx={{ fontSize: "var(--fs-lg)" }} />
          </Box>
        )}
      </Box>
    </Box>
    </>
  );
}
