import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import type { Invoice } from "../../api/types";
import EmptyState from "../../ui/EmptyState";
import ListPager from "../../ui/ListPager";
import ListState from "../../ui/ListState";
import Table from "../../ui/Table";
import InvoiceRows from "../billing/invoicesPage/InvoiceRows";
import InvoiceSplitView from "../billing/invoicesPage/InvoiceSplitView";
import { INVOICE_COLUMNS } from "../billing/invoicesPage/invoiceColumns";
import { useInvoiceRowActions } from "../billing/invoicesPage/useInvoiceRowActions";
import { useInvoiceList } from "../billing/queries";

const PAGE_SIZE = 25;

// A customer's invoices, the same way as the Invoices page: a table, which
// narrows to a list beside the open invoice. The open invoice is kept in the URL
// (?invoice=12), so Back and links work.
export default function CustomerInvoicesTab({ customerId, onChanged }: { customerId: number; onChanged?: () => void }) {
  const [params, setParams] = useSearchParams();
  const theme = useTheme();
  const isWide = useMediaQuery(theme.breakpoints.up("md"), { noSsr: true });
  const rowActions = useInvoiceRowActions();
  const columns = useMemo(() => INVOICE_COLUMNS.filter((c) => c.field !== "customer_name"), []);

  const selectedId = Number(params.get("invoice")) || null;
  const page = Math.max(1, Math.trunc(Number(params.get("invoicePage"))) || 1);
  const list = useInvoiceList({ customer_id: customerId, page, page_size: PAGE_SIZE });
  const invoices: Invoice[] = list.data?.items ?? [];
  const total = list.data?.total ?? 0;

  const setParam = (key: string, value: string | null, replace = false) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace },
    );
  const open = (id: number) => setParam("invoice", String(id));
  const close = () => setParam("invoice", null);
  const changePage = (next: number) => setParam("invoicePage", next > 1 ? String(next) : null, true);

  if (selectedId) {
    return (
      <InvoiceSplitView
        invoices={invoices}
        selectedId={selectedId}
        onOpen={open}
        onClose={close}
        isPending={list.isPending}
        isError={list.isError}
        emptyTitle="No invoices yet"
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={changePage}
        onChanged={onChanged}
        height={{ xs: "auto", md: "max(560px, calc(100vh - 240px))" }}
        closeLabel="Close and show all of this customer's invoices"
      />
    );
  }

  if (!list.isPending && invoices.length === 0) {
    return list.isError ? (
      <ListState loading={false} error empty={false} errorText="Couldn't load invoices." emptyText="" />
    ) : (
      <EmptyState icon={<ReceiptLongRoundedIcon />} title="No invoices yet" description="Invoices for this customer will appear here." />
    );
  }

  return isWide ? (
    <Table<Invoice>
      bare
      rows={invoices}
      columns={columns}
      loading={list.isPending || list.isFetching}
      onRowSelect={(row) => open(row.id)}
      paginationMode="server"
      rowCount={total}
      paginationModel={{ page: page - 1, pageSize: PAGE_SIZE }}
      onPaginationModelChange={(model) => changePage(model.page + 1)}
      pageSizeOptions={[PAGE_SIZE]}
      actionsWidth={150}
      renderActions={rowActions}
    />
  ) : (
    <>
      <InvoiceRows invoices={invoices} onOpen={open} />
      <Box sx={{ display: "flex", justifyContent: "center", "&:not(:empty)": { borderTop: "1px solid var(--slate-100)", py: 0.5 } }}>
        <ListPager page={page} pageSize={PAGE_SIZE} total={total} onPageChange={changePage} />
      </Box>
    </>
  );
}
