import type { GridColDef } from "@mui/x-data-grid";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import PeopleRoundedIcon from "@mui/icons-material/PeopleRounded";
import CrudActions from "../../ui/Actions";
import Button from "../../ui/Button";
import Table from "../../ui/Table";
import TableSearchBar from "../../ui/TableSearchBar";
import Dialog from "../../ui/Dialog";
import AddCustomer from "./AddCustomer";
import CustomerInvoicesDrawer from "../billing/CustomerInvoicesDrawer";
import { useDialogStore } from "../../store/useDialogStore";
import { useConfirmDialogStore } from "../../hooks/useconfirmDialogStore";
import { useOnDialogClose } from "../../hooks/useOnDialogClose";
import { apiService } from "../../api/service";
import Chip from "../../ui/Chip";
import { semanticChipSx } from "../../ui/chipStyles";
import { shareToWhatsAppAfter } from "../documents/shareToWhatsApp";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatRupees } from "../../format/money";
import { messages } from "../../messages";
import EmptyState from "../../ui/EmptyState";
import InitialsAvatar from "../../ui/InitialsAvatar";
import PageHeader from "../../ui/PageHeader";
import PageShell from "../../ui/PageShell";
import TableCard from "../../ui/TableCard";

interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  contact_number: string;
  email: string;
  // B2B company this customer is a contact of, if any (see app/companies).
  company_id?: number | null;
  // Computed server-side per page load (see GET /customers) - who still
  // owes money at a glance, without opening each customer's profile.
  payment_status?: "paid" | "pending" | "no_invoices" | null;
  outstanding_balance?: number | null;
  invoice_count?: number | null;
}

interface CompanyOption {
  id: number;
  name: string;
}

const PAYMENT_STATUS_META: Record<string, { color: string; label: string }> = {
  paid: { color: "var(--green-600)", label: "Paid" },
  pending: { color: "var(--amber-600)", label: "Pending" },
  no_invoices: { color: "var(--slate-500)", label: "No Invoices" },
};

interface CustomerListResponse {
  items: Customer[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Takes the fetched company list, not a static array - the Company column's
// valueOptions (and its resolved display label, via singleSelect's own
// default renderCell) depend on it. Factory rather than a plain constant
// for the same reason buildBaseColumns already is one elsewhere in this
// codebase - a module-level constant can't close over component state.
const secondaryCell = ({ value }: { value?: string | null }) => (
  <Box component="span" sx={{ color: value ? "var(--slate-600)" : "var(--slate-400)" }}>{value || "—"}</Box>
);

const buildColumns = (companies: CompanyOption[], onOpenInvoices: (customer: Customer) => void): GridColDef[] => [
  {
    field: "first_name",
    headerName: "First Name",
    flex: 1,
    minWidth: 160,
    editable: true,
    renderCell: ({ row, value }) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, height: "100%", minWidth: 0 }}>
        <InitialsAvatar name={`${row.first_name} ${row.last_name}`} />
        <Box component="span" sx={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>
          {value}
        </Box>
      </Box>
    ),
  },
  {
    field: "last_name",
    headerName: "Last Name",
    flex: 0.8,
    minWidth: 110,
    editable: true,
    renderCell: ({ value }) => <Box component="span" sx={{ fontWeight: 600 }}>{value}</Box>,
  },
  { field: "contact_number", headerName: "Contact", width: 130, editable: true, renderCell: secondaryCell },
  { field: "email", headerName: "Email", flex: 1.4, minWidth: 190, editable: true, renderCell: secondaryCell },
  {
    field: "company_id",
    headerName: "Company",
    flex: 1,
    minWidth: 130,
    editable: true,
    type: "singleSelect",
    valueOptions: [
      { value: null, label: "No Company" },
      ...companies.map((c) => ({ value: c.id, label: c.name })),
    ],
    renderCell: ({ value }) => secondaryCell({ value: companies.find((c) => c.id === value)?.name }),
  },
  {
    field: "invoice_count",
    headerName: "Invoices",
    width: 110,
    sortable: false,
    editable: false,
    renderCell: ({ row, value }) =>
      value ? (
        <Box
          component="button"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenInvoices(row);
          }}
          sx={{
            p: 0,
            border: "none",
            background: "none",
            cursor: "pointer",
            font: "inherit",
            fontWeight: 600,
            color: "var(--blue-700)",
            "&:hover": { textDecoration: "underline" },
          }}
        >
          {value === 1 ? "1 invoice" : `${value} invoices`}
        </Box>
      ) : (
        <Box component="span" sx={{ color: "var(--slate-400)" }}>None</Box>
      ),
  },
  {
    field: "payment_status",
    headerName: "Payment",
    width: 190,
    sortable: false,
    editable: false,
    renderCell: ({ row }) => {
      const meta = PAYMENT_STATUS_META[row.payment_status ?? "no_invoices"] ?? PAYMENT_STATUS_META.no_invoices;
      return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, height: "inherit" }}>
          <Chip label={meta.label} sx={semanticChipSx(meta.color)} />
          {row.payment_status === "pending" && !!row.outstanding_balance && (
            <span style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--amber-800)" }}>
              {formatRupees(row.outstanding_balance)}
            </span>
          )}
        </Box>
      );
    },
  },
];

const Customers = () => {
  const navigate = useNavigate();
  const { openDialog } = useDialogStore();
  const { showDialog, closeDialog, setLoading } = useConfirmDialogStore();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoadingState] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  // Fetched once, not paginated with the customer list itself - a print
  // shop's realistic B2B account count stays in the dozens/low hundreds,
  // so a single generous page covers the Company column's valueOptions
  // without needing a searchable async picker for inline grid editing.
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  // Customer whose invoices are open in the right-side drawer - opened by
  // clicking a row (see Table's onRowSelect below), closed via the drawer's
  // own close button/backdrop.
  const [drawerCustomerId, setDrawerCustomerId] = useState<number | null>(null);
  const drawerCustomer = customers.find((c) => c.id === drawerCustomerId) ?? null;
  const openInvoices = (customer: Customer) => setDrawerCustomerId(customer.id);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [paginationModel, setPaginationModel] = useState({
    page: 0, // MUI DataGrid pages are 0-indexed; the API is 1-indexed.
    pageSize: 10,
  });

  // Debounce the search box so every keystroke doesn't fire a request.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // A new search should land back on page 1.
  useEffect(() => {
    setPaginationModel((prev) => (prev.page === 0 ? prev : { ...prev, page: 0 }));
  }, [debouncedSearch]);

  const fetchCustomers = async () => {
    setLoadingState(true);
    try {
      const res = await apiService.get<CustomerListResponse>("/customers", {
        params: {
          page: paginationModel.page + 1,
          page_size: paginationModel.pageSize,
          search: debouncedSearch || undefined,
        },
      });
      // Deleting the last customer on a page shouldn't strand you on an empty one.
      if (res.items.length === 0 && res.total > 0 && paginationModel.page > 0) {
        const lastPage = Math.ceil(res.total / paginationModel.pageSize) - 1;
        setPaginationModel((current) => ({ ...current, page: lastPage }));
        return;
      }
      setCustomers(res.items);
      setTotal(res.total);
      setLoadFailed(false);
    } catch (err) {
      console.error("Error fetching customers", err);
      setLoadFailed(true);
    } finally {
      setLoadingState(false);
      setLoaded(true);
    }
  };

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationModel, debouncedSearch]);

  // Editing an invoice opened from the drawer can change what a customer owes.
  useOnDialogClose(fetchCustomers);

  useEffect(() => {
    apiService
      .get<{ items: CompanyOption[] }>("/companies", { params: { page_size: 100 } })
      .then((res) => setCompanies(res.items))
      .catch((err) => console.error("Error fetching companies", err));
  }, []);

  const rows = useMemo(() => customers.map((c) => ({ ...c, id: c.id })), [customers]);

  const columns = useMemo(() => buildColumns(companies, openInvoices), [companies]);

  const processRowUpdate = async (newRow: Customer, oldRow: Customer) => {
    const payload: Partial<Customer> = {
      first_name: newRow.first_name,
      last_name: newRow.last_name,
      contact_number: newRow.contact_number,
      email: newRow.email,
      company_id: newRow.company_id ?? null,
    };

    const hasChanges = (Object.keys(payload) as (keyof Customer)[]).some(
      (key) => payload[key] !== (oldRow as Customer)[key],
    );

    if (!hasChanges) return oldRow;

    await apiService.put(`/customers/${newRow.id}`, payload);
    return newRow;
  };

  const handleDelete = (id: number) => {
    showDialog({
      title: "Delete Customer?",
      description: messages.bin.moveNotice,
      confirmText: "Delete",
      isDestructive: true,
      onConfirm: async () => {
        try {
          setLoading(true);
          await apiService.delete(`/customers/${id}`);
          await fetchCustomers();
          closeDialog();
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // Staff-invited portal access (no public self-service signup - see
  // app/client_auth) - the invite link is built client-side (no
  // FRONTEND_URL exists on the backend, matching every other cross-page
  // link in this app) then handed to the same manual wa.me share every
  // other WhatsApp send in the app already uses; staff still picks the
  // actual recipient themselves.
  //
  // shareToWhatsAppAfter, not shareToWhatsApp directly - this has to POST
  // for the invite token before the wa.me text is known; the helper waits
  // for that, then opens WhatsApp (see features/documents/shareToWhatsApp.ts).
  const handleSendPortalInvite = (customer: Customer) => {
    shareToWhatsAppAfter(async () => {
      const { invite_token } = await apiService.post<{ invite_token: string }>(
        `/client-auth/invite/${customer.id}`,
      );
      const activateUrl = `${window.location.origin}/portal/activate?token=${invite_token}`;
      return `Hi ${customer.first_name}, here's your Zybrannox client portal invite - use this link to set up your account and view your orders and billing: ${activateUrl}`;
    }).catch((err) => {
      showDialog({
        title: "Couldn't send invite",
        description: getApiErrorMessage(err, messages.errors.generic),
        confirmText: "OK",
      });
    });
  };

  return (
    <PageShell>
      <PageHeader
        title="Customers"
        description="Everyone you bill, and who still owes money."
        action={<Button onClick={() => openDialog("customer")}>+ Add Customer</Button>}
      />

      <TableCard
        toolbar={
          <>
            <Typography sx={{ fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--slate-700)" }}>
              {total} {total === 1 ? "customer" : "customers"}
            </Typography>
            <TableSearchBar
              value={searchInput}
              onChange={setSearchInput}
              placeholder={messages.placeholders.searchCustomers}
              sx={{ width: { xs: "100%", sm: 280 } }}
            />
          </>
        }
      >
        {loaded && !loading && rows.length === 0 ? (
          <EmptyState
            icon={<PeopleRoundedIcon />}
            title={loadFailed ? "Couldn't load your customers" : debouncedSearch ? "No customers match" : "No customers yet"}
            description={
              loadFailed
                ? "Check your connection and refresh the page."
                : debouncedSearch
                  ? "Try a different name, phone number or email."
                  : "Add your first customer to start billing."
            }
          />
        ) : (
          <Table<Customer>
            bare
            rows={rows}
            columns={columns}
            processRowUpdate={processRowUpdate}
            renderActions={(params, handlers) => [
              <CrudActions
                key="crud"
                edit
                delete
                viewCustomer
                sendPortalInvite
                onEdit={handlers.edit}
                onDelete={() => handleDelete(params.row.id)}
                onViewCustomer={() => navigate(`/admin/customers/${params.row.id}`)}
                onSendPortalInvite={() => handleSendPortalInvite(params.row)}
              />,
            ]}
            onRowSelect={openInvoices}
            paginationMode="server"
            rowCount={total}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            loading={loading}
          />
        )}
      </TableCard>

      <CustomerInvoicesDrawer customer={drawerCustomer} onClose={() => setDrawerCustomerId(null)} onChanged={fetchCustomers} />
      <Dialog
        type="customer"
        title="Customer"
        children={<AddCustomer onSuccess={fetchCustomers} />}
        maxWidth="xs"
      />
    </PageShell>
  );
};

export default Customers;
