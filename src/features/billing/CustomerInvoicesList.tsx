import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button as MuiButton, CircularProgress, IconButton, Menu, MenuItem, Typography, Tooltip } from "@mui/material";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";

import { formatDate } from "../../format/date";
import InvoiceStatusChip from "./InvoiceStatusChip";
import { useDialogStore } from "../../store/useDialogStore";
import { useConfirmDialogStore } from "../../hooks/useconfirmDialogStore";
import { useInvoiceActions } from "./useInvoiceActions";
import { shareInvoiceToWhatsApp } from "./shareInvoiceToWhatsApp";
import { downloadInvoicePdf } from "./downloadDocument";
import { useInvoiceList, useInvalidateBilling } from "./queries";
import ListPager from "../../ui/ListPager";
import PaymentHistory from "./PaymentHistory";
import ProjectFilesButton from "./ProjectFilesButton";
import RecordPaymentDialog from "./RecordPaymentDialog";
import { formatRupees } from "../../format/money";
import { messages } from "../../messages";
import ListState from "../../ui/ListState";
import { surfaceSx } from "../../ui/surface";

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
  onChanged,
}: {
  customerId: number;
  // When the page around this list shows figures a payment or cancel changes.
  onChanged?: () => void;
  // Off when already on the customer's own page (see CustomerInvoicesDrawer).
  showCustomerLink?: boolean;
}) {
  const navigate = useNavigate();
  const { openDialog } = useDialogStore();
  const { showDialog } = useConfirmDialogStore();
  const [page, setPage] = useState(1);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [menu, setMenu] = useState<{ anchor: HTMLElement; id: number; number: string } | null>(null);

  const query = useInvoiceList({ customer_id: customerId, page, page_size: PAGE_SIZE });
  const invoices = query.data?.items ?? null;
  const total = query.data?.total ?? 0;
  const error = query.isError;
  // After an action on a card: refetch this list (and any other billing list
  // showing the same invoice) instead of patching local state.
  const invalidate = useInvalidateBilling();
  const load = () => {
    invalidate();
    onChanged?.();
  };
  const { markPaid: handleMarkPaid, cancel: handleCancel, paymentTarget, setPaymentTarget } = useInvoiceActions(load);

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
    <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, ...surfaceSx, overflow: "hidden" }}>
      {invoices.map((inv) => {
        const pending = inv.status === "pending";
        const partlyPaid = pending && inv.balance_due < inv.amount;
        return (
          <Box
            component="li"
            key={inv.id}
            role="button"
            tabIndex={0}
            aria-label={`Open invoice ${inv.invoice_number}`}
            onClick={() => openDialog("viewInvoice", inv.id, "view")}
            onKeyDown={(e) => {
              if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                openDialog("viewInvoice", inv.id, "view");
              }
            }}
            sx={{
              px: 1.5,
              py: 1.25,
              cursor: "pointer",
              transition: "background-color 0.15s ease",
              "& + &": { borderTop: "1px solid var(--slate-100)" },
              "&:hover": { bgcolor: "var(--slate-50)" },
              "&:focus-visible": { outline: "2px solid var(--blue-500)", outlineOffset: -2 },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
              <Typography noWrap sx={{ fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--blue-700)", minWidth: 0 }}>
                {inv.invoice_number}
              </Typography>
              <Typography sx={{ fontSize: "var(--fs-md)", fontWeight: 700, color: "var(--slate-900)", flexShrink: 0 }}>
                {formatRupees(inv.amount)}
              </Typography>
            </Box>

            <Tooltip title={inv.project_type && inv.project_description ? `${inv.project_type} — ${inv.project_description}` : ""}>
              <Typography noWrap sx={{ mt: 0.25, fontSize: "var(--fs-xs)", color: "var(--slate-500)" }}>
                {[inv.project_type, formatDate(inv.created_at), inv.due_date ? `Due ${formatDate(inv.due_date)}` : null].filter(Boolean).join(" · ")}
              </Typography>
            </Tooltip>

            <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, mt: 0.75 }}>
              <InvoiceStatusChip invoice={inv} />
              {partlyPaid && (
                <Typography sx={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--amber-800)" }}>
                  {formatRupees(inv.amount - inv.balance_due)} paid · {formatRupees(inv.balance_due)} due
                </Typography>
              )}
            </Box>

            <Box
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              sx={{ display: "flex", alignItems: "center", gap: 0.25, mt: 0.75, "& .MuiIconButton-root": { color: "var(--slate-500)" } }}
            >
              <Tooltip title={messages.actions.invoice.shareWhatsApp}>
                <IconButton
                  size="small"
                  aria-label={messages.actions.invoice.shareWhatsApp}
                  onClick={() =>
                    shareInvoiceToWhatsApp(inv.id).catch((err) => {
                      console.error("Failed to share invoice to WhatsApp", err);
                      handleShareFailed();
                    })
                  }
                >
                  <WhatsAppIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Download PDF">
                <span>
                  <IconButton size="small" aria-label="Download PDF" disabled={downloadingId === inv.id} onClick={() => handleDownload(inv.id)}>
                    {downloadingId === inv.id ? <CircularProgress size={16} thickness={5} /> : <FileDownloadRoundedIcon sx={{ fontSize: 18 }} />}
                  </IconButton>
                </span>
              </Tooltip>
              <PaymentHistory invoiceId={inv.id} />
              <ProjectFilesButton invoiceId={inv.id} invoiceNumber={inv.invoice_number} />
              <Box sx={{ flex: 1 }} />
              {pending && (
                <>
                  <MuiButton
                    size="small"
                    variant="outlined"
                    onClick={() =>
                      setPaymentTarget({ id: inv.id, invoice_number: inv.invoice_number, amount: inv.amount, balance_due: inv.balance_due })
                    }
                    sx={{ textTransform: "none", fontWeight: 600, borderRadius: "8px", color: "var(--slate-700)", borderColor: "var(--slate-300)", whiteSpace: "nowrap", bgcolor: "var(--white)", "&:hover": { borderColor: "var(--blue-500)", color: "var(--blue-700)", bgcolor: "var(--white)" } }}
                  >
                    {messages.actions.invoice.recordPayment}
                  </MuiButton>
                  <Tooltip title="More">
                    <IconButton
                      size="small"
                      aria-label={`More actions for ${inv.invoice_number}`}
                      onClick={(e) => setMenu({ anchor: e.currentTarget, id: inv.id, number: inv.invoice_number })}
                    >
                      <MoreHorizRoundedIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>

    <Menu anchorEl={menu?.anchor} open={!!menu} onClose={() => setMenu(null)}>
      <MenuItem
        onClick={() => {
          if (menu) handleMarkPaid(menu.id);
          setMenu(null);
        }}
        sx={{ fontSize: "var(--fs-sm)" }}
      >
        {messages.actions.invoice.markPaid}
      </MenuItem>
      <MenuItem
        onClick={() => {
          if (menu) handleCancel(menu.id, menu.number);
          setMenu(null);
        }}
        sx={{ fontSize: "var(--fs-sm)", color: "var(--red-600)" }}
      >
        {messages.actions.invoice.cancel}
      </MenuItem>
    </Menu>

    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pt: 1 }}>
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
    </>
  );
}
