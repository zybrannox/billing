import { useState, type ReactNode } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import type { Invoice } from "../../../api/types";
import { useOnDialogClose } from "../../../hooks/useOnDialogClose";
import { useDialogStore } from "../../../store/useDialogStore";
import EmptyState from "../../../ui/EmptyState";
import ListPager from "../../../ui/ListPager";
import ListState from "../../../ui/ListState";
import InvoiceView from "../InvoiceView";
import { useInvalidateBilling } from "../queries";
import InvoiceFilesStrip from "./InvoiceFilesStrip";
import InvoiceRows from "./InvoiceRows";
import PaymentActions from "./PaymentActions";

// Zoho-style: invoices narrowed to a list down the left, the open one on the
// right with its files and payment actions. Used by the Invoices page and a
// customer's Invoices tab, which each decide what's listed and where the open
// invoice is remembered.
export default function InvoiceSplitView({
  invoices,
  selectedId,
  onOpen,
  onClose,
  listHeader,
  isPending,
  isError,
  emptyTitle,
  emptyDescription,
  page,
  pageSize,
  total,
  onPageChange,
  onChanged,
  height = { xs: "auto", md: "calc(100vh - 64px)" },
  closeLabel = "Close and show the full list",
}: {
  invoices: Invoice[];
  selectedId: number;
  onOpen: (id: number) => void;
  onClose: () => void;
  listHeader?: ReactNode;
  isPending: boolean;
  isError: boolean;
  emptyTitle: string;
  emptyDescription?: string;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onChanged?: () => void;
  height?: object | string;
  closeLabel?: string;
}) {
  const invalidate = useInvalidateBilling();
  const dialogInvoiceOpen = useDialogStore((s) => s.isDialogOpen && s.editingType === "viewInvoice");
  const [reloadKey, setReloadKey] = useState(0);

  const changed = () => {
    setReloadKey((k) => k + 1);
    invalidate();
    onChanged?.();
  };

  // Editing the open invoice happens in a dialog: show the result once it closes.
  useOnDialogClose(() => setReloadKey((k) => k + 1));

  const selected = invoices.find((i) => i.id === selectedId);

  return (
    <Box sx={{ display: "flex", minWidth: 0, height, bgcolor: "var(--white)" }}>
      {/* The list, narrowed down the left. On a phone the invoice takes the screen. */}
      <Box
        component="aside"
        aria-label="Invoices"
        className="invoice-toolbar"
        sx={{ display: { xs: "none", md: "flex" }, flexDirection: "column", width: 340, flexShrink: 0, borderRight: "1px solid var(--slate-200)" }}
      >
        {listHeader && <Box sx={{ p: 1.5, borderBottom: "1px solid var(--slate-100)" }}>{listHeader}</Box>}
        <Box sx={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {invoices.length === 0 ? (
            isPending || isError ? (
              <ListState loading={isPending} error={isError} empty={false} errorText="Couldn't load invoices." emptyText="" />
            ) : (
              <EmptyState title={emptyTitle} description={emptyDescription} />
            )
          ) : (
            <InvoiceRows invoices={invoices} selectedId={selectedId} onOpen={onOpen} />
          )}
        </Box>
        <Box sx={{ display: "flex", justifyContent: "center", "&:not(:empty)": { borderTop: "1px solid var(--slate-100)", py: 0.5 } }}>
          <ListPager page={page} pageSize={pageSize} total={total} onPageChange={onPageChange} />
        </Box>
      </Box>

      {/* The open invoice. Hidden from printing while the same invoice is open in
          a dialog on top of it, so only one copy prints. */}
      <Box sx={{ flex: 1, minWidth: 0, overflowY: "auto", bgcolor: "var(--slate-50)", ...(dialogInvoiceOpen ? { "@media print": { display: "none" } } : {}) }}>
        <Box className="invoice-toolbar" sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 2, pt: 1.5 }}>
          <Tooltip title="Back to the list">
            <IconButton aria-label="Back to the list" onClick={onClose} size="small" sx={{ display: { md: "none" } }}>
              <ArrowBackRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Box sx={{ flex: 1 }} />
          <Tooltip title={closeLabel}>
            <IconButton aria-label="Close invoice" onClick={onClose} size="small" sx={{ display: { xs: "none", md: "inline-flex" } }}>
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ px: { xs: 1.5, md: 3 }, pb: 3 }}>
          <InvoiceFilesStrip key={`files-${selectedId}`} invoiceId={selectedId} invoiceNumber={selected?.invoice_number} />
          <InvoiceView
            key={selectedId}
            invoiceId={selectedId}
            reloadKey={reloadKey}
            onClose={onClose}
            renderActions={(invoice) => <PaymentActions invoice={invoice} onChanged={changed} />}
          />
        </Box>
      </Box>
    </Box>
  );
}
