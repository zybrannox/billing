import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Tooltip } from "@mui/material";
import FolderOpenRoundedIcon from "@mui/icons-material/FolderOpenRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";

import { apiService } from "../../api/service";
import { formatDateTime } from "../../format/date";
import { getSemanticColor } from "../../utils/colors";
import { useDialogStore } from "../../store/useDialogStore";
import { useConfirmDialogStore } from "../../hooks/useconfirmDialogStore";
import { useInvoiceStore } from "./useInvoiceStore";
import { shareInvoiceToWhatsApp } from "./shareInvoiceToWhatsApp";
import { downloadInvoicePdf } from "./downloadDocument";
import { useInvoiceList, useInvalidateBilling } from "./queries";
import Chip from "../../ui/Chip";
import { semanticChipSx } from "../../ui/chipStyles";
import CrudActions from "../../ui/Actions";
import ListPager from "../../ui/ListPager";
import PaymentHistory from "./PaymentHistory";
import ProjectFilesButton from "./ProjectFilesButton";
import RecordPaymentDialog, { type RecordPaymentTarget } from "./RecordPaymentDialog";
import { formatRupeesWhole as money } from "../../format/money";
import { messages } from "../../messages";
import ListState from "../../ui/ListState";

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

export default function CustomerInvoicesList({
  customerId,
  showCustomerLink = true,
}: {
  customerId: number;
  // Off when already on the customer's own page (see CustomerInvoicesDrawer).
  showCustomerLink?: boolean;
}) {
  const navigate = useNavigate();
  const { openDialog } = useDialogStore();
  const { showDialog } = useConfirmDialogStore();
  const { updateInvoice } = useInvoiceStore();
  const [page, setPage] = useState(1);
  const [paymentTarget, setPaymentTarget] = useState<RecordPaymentTarget | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const query = useInvoiceList({ customer_id: customerId, page, page_size: PAGE_SIZE });
  const invoices = query.data?.items ?? null;
  const total = query.data?.total ?? 0;
  const error = query.isError;
  // After an action on a card: refetch this list (and any other billing list
  // showing the same invoice) instead of patching local state.
  const load = useInvalidateBilling();

  const handleDownload = async (invoiceId: number) => {
    setDownloadingId(invoiceId);
    try {
      await downloadInvoicePdf(invoiceId);
    } catch (err) {
      console.error("Failed to download invoice", err);
      showDialog({
        title: "Couldn't download invoice",
        description: "Something went wrong preparing the PDF. Please try again.",
        confirmText: "OK",
      });
    } finally {
      setDownloadingId(null);
    }
  };

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
        errorText={messages.loadFailed.customerInvoices}
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
                getSemanticColor("invoiceStatus", inv.status),
              )}
            />
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
            <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
              {formatDateTime(inv.created_at)}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
              <PaymentHistory invoiceId={inv.id} />
              <ProjectFilesButton invoiceId={inv.id} invoiceNumber={inv.invoice_number} />
              <Typography variant="caption" sx={{ color: "var(--amber-700)", fontWeight: 600 }} noWrap>
                {inv.status === "pending" && inv.balance_due < inv.amount
                  ? `Paid ${money(inv.amount - inv.balance_due)} · ${money(inv.balance_due)} due`
                  : ""}
              </Typography>
            </Box>
            <Box onClick={(e) => e.stopPropagation()}>
            <CrudActions
              downloadDocument
              onDownloadDocument={() => handleDownload(inv.id)}
              documentBusy={downloadingId === inv.id}
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
          </Box>
        </Box>
      ))}

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pt: 0.5 }}>
        <ListPager page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />

        {showCustomerLink && (
          <Box
            component="button"
            type="button"
            onClick={() => navigate(`/admin/customers/${customerId}`)}
            sx={{
              ml: "auto",
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
            {messages.actions.customer.view}
            <ArrowForwardRoundedIcon sx={{ fontSize: "var(--fs-lg)" }} />
          </Box>
        )}
      </Box>
    </Box>
    </>
  );
}
