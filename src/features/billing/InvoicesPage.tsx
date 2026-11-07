import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import type { Invoice } from "../../api/types";
import { useDialogStore } from "../../store/useDialogStore";
import Button from "../../ui/Button";
import EmptyState from "../../ui/EmptyState";
import ListPager from "../../ui/ListPager";
import ListState from "../../ui/ListState";
import PageShell from "../../ui/PageShell";
import Table from "../../ui/Table";
import TableSearchBar from "../../ui/TableSearchBar";
import InvoiceRows from "./invoicesPage/InvoiceRows";
import { INVOICE_COLUMNS } from "./invoicesPage/invoiceColumns";
import InvoiceSplitView from "./invoicesPage/InvoiceSplitView";
import { useInvoiceRowActions } from "./invoicesPage/useInvoiceRowActions";
import PaymentSummary from "./invoicesPage/PaymentSummary";
import { VIEWS } from "./invoicesPage/invoiceViews";
import ViewPicker from "./invoicesPage/ViewPicker";
import { useInvoiceList, useInvoiceSummary, type InvoiceViewName } from "./queries";
import { surfaceSx } from "../../ui/surface";

const PAGE_SIZE = 25;
const VIEW_VALUES = VIEWS.map((v) => v.value as string);

// All invoices, Zoho-style: a full table with a payment summary, which narrows
// to a list down the left once an invoice is open on the right. The open invoice
// and the chosen view live in the URL, so Back and links both work.
export default function InvoicesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { search: queryString } = useLocation();
  const [params, setParams] = useSearchParams();
  const base = "/admin/invoices";

  const theme = useTheme();
  const isWide = useMediaQuery(theme.breakpoints.up("md"), { noSsr: true });
  const openDialog = useDialogStore((s) => s.openDialog);

  // Whatever a link or old bookmark says, only ask the server for what exists.
  const requestedView = params.get("view") ?? "all";
  const view = VIEW_VALUES.includes(requestedView) ? requestedView : "all";
  const search = params.get("q") ?? "";
  const page = Math.max(1, Math.trunc(Number(params.get("page"))) || 1);
  const [searchInput, setSearchInput] = useState(search);

  const selectedId = id ? Number(id) : null;

  const updateParams = (changes: Record<string, string | null>) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
        return next;
      },
      { replace: true },
    );
  };

  // A search typed here waits for a pause, and a search or view change goes back
  // to page 1.
  useEffect(() => {
    if (searchInput === search) return;
    const timer = setTimeout(() => updateParams({ q: searchInput || null, page: null }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // ...and a search arriving from the top bar shows up in the box.
  useEffect(() => setSearchInput(search), [search]);

  const changeView = (next: string) => updateParams({ view: next === "all" ? null : next, page: null });

  const list = useInvoiceList({
    page,
    page_size: PAGE_SIZE,
    search: search || undefined,
    view: view === "all" ? undefined : (view as InvoiceViewName),
  });
  const summary = useInvoiceSummary();
  const invoices = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const counts = summary.data?.counts;

  // A page past the end (a link, or the last invoice on it moving to another
  // view) goes to the real last page rather than showing an empty list.
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pastTheEnd = !!list.data && !list.isFetching && page > lastPage;
  useEffect(() => {
    if (pastTheEnd) updateParams({ page: lastPage > 1 ? String(lastPage) : null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pastTheEnd, lastPage]);

  const openInvoice = (invoiceId: number) => navigate(`${base}/${invoiceId}${queryString}`);
  const closeInvoice = () => navigate(`${base}${queryString}`);

  const rowActions = useInvoiceRowActions();

  const newButton = (
    <Button size="small" onClick={() => openDialog("invoiceDesignComplete")}>+ New</Button>
  );

  const emptyTitle = list.isError
    ? "Couldn't load invoices"
    : search
      ? "No invoices match"
      : view === "overdue"
        ? "Nothing is overdue"
        : view === "unpaid"
          ? "Nothing is unpaid"
          : "No invoices here yet";
  const emptyDescription = list.isError
    ? "Check your connection and refresh the page."
    : search
      ? "Try an invoice number, customer name, phone number or job."
      : undefined;

  if (!selectedId) {
    return (
      <PageShell>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5, mb: 2 }}>
          <ViewPicker view={view} counts={counts} onChange={changeView} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", flex: { xs: "1 1 100%", sm: "0 1 auto" } }}>
            <TableSearchBar value={searchInput} onChange={setSearchInput} placeholder="Number, customer, phone or job" sx={{ flex: 1, width: { sm: 300 } }} />
            {newButton}
          </Box>
        </Box>

        <PaymentSummary onView={changeView} />

        <Box component="section" sx={{ ...surfaceSx, overflow: "hidden", minWidth: 0 }}>
          {!list.isPending && invoices.length === 0 ? (
            <EmptyState icon={<ReceiptLongRoundedIcon />} title={emptyTitle} description={emptyDescription} />
          ) : !isWide ? (
            invoices.length === 0 ? (
              <ListState loading={list.isPending} error={list.isError} empty={false} errorText="Couldn't load invoices." emptyText="" />
            ) : (
              <>
                <InvoiceRows invoices={invoices} onOpen={openInvoice} />
                <Box sx={{ display: "flex", justifyContent: "center", "&:not(:empty)": { borderTop: "1px solid var(--slate-100)", py: 0.5 } }}>
                  <ListPager page={page} pageSize={PAGE_SIZE} total={total} onPageChange={(next) => updateParams({ page: next > 1 ? String(next) : null })} />
                </Box>
              </>
            )
          ) : (
            <Table<Invoice>
              bare
              rows={invoices}
              columns={INVOICE_COLUMNS}
              loading={list.isPending || list.isFetching}
              onRowSelect={(row) => openInvoice(row.id)}
              paginationMode="server"
              rowCount={total}
              paginationModel={{ page: page - 1, pageSize: PAGE_SIZE }}
              onPaginationModelChange={(model) => updateParams({ page: model.page > 0 ? String(model.page + 1) : null })}
              pageSizeOptions={[PAGE_SIZE]}
              actionsWidth={150}
              renderActions={rowActions}
            />
          )}
        </Box>
      </PageShell>
    );
  }

  return (
    <Box component="main" sx={{ minWidth: 0, borderTop: "1px solid var(--slate-200)" }}>
      <InvoiceSplitView
        invoices={invoices}
        selectedId={selectedId}
        onOpen={openInvoice}
        onClose={closeInvoice}
        isPending={list.isPending}
        isError={list.isError}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={(next) => updateParams({ page: next > 1 ? String(next) : null })}
        listHeader={
          <>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1, "& button:first-of-type": { fontSize: "var(--fs-2xl)" } }}>
              <ViewPicker view={view} counts={counts} onChange={changeView} />
              {newButton}
            </Box>
            <TableSearchBar value={searchInput} onChange={setSearchInput} placeholder="Number, customer, phone or job" sx={{ width: "100%", minWidth: 0 }} />
          </>
        }
      />
    </Box>
  );
}
