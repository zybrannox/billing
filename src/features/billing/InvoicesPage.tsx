import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Box, IconButton, Tooltip, useMediaQuery, useTheme } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import type { Invoice } from "../../api/types";
import { useConfirmDialogStore } from "../../hooks/useconfirmDialogStore";
import { useOnDialogClose } from "../../hooks/useOnDialogClose";
import { useDialogStore } from "../../store/useDialogStore";
import CrudActions from "../../ui/Actions";
import Button from "../../ui/Button";
import EmptyState from "../../ui/EmptyState";
import ListPager from "../../ui/ListPager";
import ListState from "../../ui/ListState";
import PageShell from "../../ui/PageShell";
import Table from "../../ui/Table";
import TableSearchBar from "../../ui/TableSearchBar";
import { downloadInvoicePdf } from "./downloadDocument";
import InvoiceView from "./InvoiceView";
import InvoiceRows from "./invoicesPage/InvoiceRows";
import { INVOICE_COLUMNS } from "./invoicesPage/invoiceColumns";
import PaymentActions from "./invoicesPage/PaymentActions";
import PaymentSummary from "./invoicesPage/PaymentSummary";
import { VIEWS } from "./invoicesPage/invoiceViews";
import ViewPicker from "./invoicesPage/ViewPicker";
import { useInvalidateBilling, useInvoiceList, useInvoiceSummary, type InvoiceViewName } from "./queries";
import { shareInvoiceToWhatsApp } from "./shareInvoiceToWhatsApp";
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
  const dialogInvoiceOpen = useDialogStore((s) => s.isDialogOpen && s.editingType === "viewInvoice");
  const { showDialog } = useConfirmDialogStore();
  const invalidate = useInvalidateBilling();

  // Whatever a link or old bookmark says, only ask the server for what exists.
  const requestedView = params.get("view") ?? "all";
  const view = VIEW_VALUES.includes(requestedView) ? requestedView : "all";
  const search = params.get("q") ?? "";
  const page = Math.max(1, Math.trunc(Number(params.get("page"))) || 1);
  const [searchInput, setSearchInput] = useState(search);
  const [reloadKey, setReloadKey] = useState(0);
  const [busyId, setBusyId] = useState<number | null>(null);

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

  const changed = () => {
    setReloadKey((k) => k + 1);
    invalidate();
  };

  // Editing the open invoice happens in a dialog: show the result once it closes.
  useOnDialogClose(() => setReloadKey((k) => k + 1));

  const openInvoice = (invoiceId: number) => navigate(`${base}/${invoiceId}${queryString}`);
  const closeInvoice = () => navigate(`${base}${queryString}`);

  const download = async (invoiceId: number) => {
    setBusyId(invoiceId);
    try {
      await downloadInvoicePdf(invoiceId);
    } catch (err) {
      console.error("Failed to download invoice", err);
      showDialog({ title: "Couldn't download invoice", description: "Something went wrong preparing the PDF. Please try again.", confirmText: "OK" });
    } finally {
      setBusyId(null);
    }
  };

  const share = (invoiceId: number) =>
    shareInvoiceToWhatsApp(invoiceId).catch((err) => {
      console.error("Failed to share invoice to WhatsApp", err);
      showDialog({ title: "Couldn't share invoice", description: "Something went wrong preparing the WhatsApp share link. Please try again.", confirmText: "OK" });
    });

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
              actionsWidth={110}
              renderActions={(rowParams) => [
                <CrudActions
                  key="invoice"
                  downloadDocument
                  onDownloadDocument={() => download(Number(rowParams.id))}
                  documentBusy={busyId === Number(rowParams.id)}
                  shareInvoice
                  onShareInvoice={() => share(Number(rowParams.id))}
                  size="small"
                />,
              ]}
            />
          )}
        </Box>
      </PageShell>
    );
  }

  return (
    <Box
      component="main"
      sx={{
        display: "flex",
        minWidth: 0,
        height: { xs: "auto", md: "calc(100vh - 64px)" },
        bgcolor: "var(--white)",
        borderTop: "1px solid var(--slate-200)",
      }}
    >
      {/* The list, narrowed down the left. On a phone the invoice takes the screen. */}
      <Box
        component="aside"
        aria-label="Invoices"
        className="invoice-toolbar"
        sx={{
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          width: 340,
          flexShrink: 0,
          borderRight: "1px solid var(--slate-200)",
        }}
      >
        <Box sx={{ p: 1.5, borderBottom: "1px solid var(--slate-100)" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1, "& button:first-of-type": { fontSize: "var(--fs-2xl)" } }}>
            <ViewPicker view={view} counts={counts} onChange={changeView} />
            {newButton}
          </Box>
          <TableSearchBar value={searchInput} onChange={setSearchInput} placeholder="Number, customer, phone or job" sx={{ width: "100%", minWidth: 0 }} />
        </Box>
        <Box sx={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {invoices.length === 0 ? (
            list.isPending || list.isError ? (
              <ListState loading={list.isPending} error={list.isError} empty={false} errorText="Couldn't load invoices." emptyText="" />
            ) : (
              <EmptyState title={emptyTitle} description={emptyDescription} />
            )
          ) : (
            <InvoiceRows invoices={invoices} selectedId={selectedId} onOpen={openInvoice} />
          )}
        </Box>
        <Box sx={{ display: "flex", justifyContent: "center", "&:not(:empty)": { borderTop: "1px solid var(--slate-100)", py: 0.5 } }}>
          <ListPager page={page} pageSize={PAGE_SIZE} total={total} onPageChange={(next) => updateParams({ page: next > 1 ? String(next) : null })} />
        </Box>
      </Box>

      {/* The open invoice. Hidden from printing while the same invoice is open in
          a dialog on top of it, so only one copy prints. */}
      <Box sx={{ flex: 1, minWidth: 0, overflowY: "auto", bgcolor: "var(--slate-50)", ...(dialogInvoiceOpen ? { "@media print": { display: "none" } } : {}) }}>
        <Box className="invoice-toolbar" sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 2, pt: 1.5 }}>
          <Tooltip title="Back to all invoices">
            <IconButton aria-label="Back to all invoices" onClick={closeInvoice} size="small" sx={{ display: { md: "none" } }}>
              <ArrowBackRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Close and show the full list">
            <IconButton aria-label="Close invoice" onClick={closeInvoice} size="small" sx={{ display: { xs: "none", md: "inline-flex" } }}>
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ px: { xs: 1.5, md: 3 }, pb: 3 }}>
          <InvoiceView
            key={selectedId}
            invoiceId={selectedId}
            reloadKey={reloadKey}
            onClose={closeInvoice}
            renderActions={(invoice) => <PaymentActions invoice={invoice} onChanged={changed} />}
          />
        </Box>
      </Box>
    </Box>
  );
}
