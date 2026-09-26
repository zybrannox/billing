import type { GridColDef, GridRowId } from "@mui/x-data-grid";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box } from "@mui/material";
import CrudActions from "../../ui/Actions";
import Button from "../../ui/Button";
import Table from "../../common/components/Table";
import TableSearchBar from "../../common/components/TableSearchBar";
import Dialog from "../../ui/Dialog";
import AddCustomer from "../../common/pages/AddCustomer";
import CustomerInvoicesList from "../components/CustomerInvoicesList";
import { useDialogStore } from "../../store/useDialogStore";
import { useConfirmDialogStore } from "../../hooks/useconfirmDialogStore";
import { apiService } from "../../api/service";
import Chip from "../../ui/Chip";
import { semanticChipSx } from "../../ui/chipStyles";
import { shareToWhatsAppAfter } from "../../utils/shareToWhatsApp";
import { getApiErrorMessage } from "../../utils/apiError";

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
const buildBaseColumns = (companies: CompanyOption[]): GridColDef[] => [
  { field: "first_name", headerName: "First Name", flex: 1, editable: true },
  { field: "last_name", headerName: "Last Name", flex: 1, editable: true },
  { field: "contact_number", headerName: "Contact Number", flex: 1, editable: true },
  { field: "email", headerName: "Email", flex: 1.5, editable: true },
  {
    field: "company_id",
    headerName: "Company",
    flex: 1.2,
    editable: true,
    type: "singleSelect",
    valueOptions: [
      { value: null, label: "No Company" },
      ...companies.map((c) => ({ value: c.id, label: c.name })),
    ],
  },
  {
    field: "payment_status",
    headerName: "Payment Status",
    flex: 1.4,
    editable: false,
    renderCell: ({ row }) => {
      const meta = PAYMENT_STATUS_META[row.payment_status ?? "no_invoices"] ?? PAYMENT_STATUS_META.no_invoices;
      return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, height: "inherit" }}>
          <Chip label={meta.label} sx={semanticChipSx(meta.color)} />
          {row.payment_status === "pending" && !!row.outstanding_balance && (
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--amber-800)" }}>
              ₹{row.outstanding_balance.toLocaleString("en-IN")}
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
  // Fetched once, not paginated with the customer list itself - a print
  // shop's realistic B2B account count stays in the dozens/low hundreds,
  // so a single generous page covers the Company column's valueOptions
  // without needing a searchable async picker for inline grid editing.
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  // Which customer's invoice peek panel (see CustomerInvoicesList) is open
  // - true accordion, one at a time, matching the Ongoing Activities/
  // project-files pattern this mirrors (see Table.tsx's renderDetailPanel).
  const [expandedCustomerId, setExpandedCustomerId] = useState<GridRowId | null>(null);

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
      setCustomers(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error("Error fetching customers", err);
    } finally {
      setLoadingState(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationModel, debouncedSearch]);

  useEffect(() => {
    apiService
      .get<{ items: CompanyOption[] }>("/companies", { params: { page_size: 100 } })
      .then((res) => setCompanies(res.items))
      .catch((err) => console.error("Error fetching companies", err));
  }, []);

  const rows = useMemo(() => customers.map((c) => ({ ...c, id: c.id })), [customers]);

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: "serialNo",
        headerName: "SI.NO",
        width: 90,
        sortable: false,
        filterable: false,
        editable: false,
        valueGetter: (_value, row) =>
          paginationModel.page * paginationModel.pageSize +
          rows.findIndex((r) => r.id === row.id) +
          1,
      },
      ...buildBaseColumns(companies),
    ],
    [rows, paginationModel, companies],
  );

  const processRowUpdate = async (newRow: Customer, oldRow: Customer) => {
    const payload: Partial<Customer> = {
      first_name: newRow.first_name,
      last_name: newRow.last_name,
      contact_number: newRow.contact_number,
      email: newRow.email,
      company_id: newRow.company_id ?? null,
    };

    const hasChanges = Object.keys(payload).some(
      (key) => payload[key as keyof Customer] !== (oldRow as any)[key],
    );

    if (!hasChanges) return oldRow;

    await apiService.put(`/customers/${newRow.id}`, payload);
    return newRow;
  };

  const handleDelete = (id: number) => {
    showDialog({
      title: "Delete Customer?",
      description: "This action cannot be undone.",
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
  // for the invite token before the wa.me text is known, and opening the
  // wa.me window only after that async request finishes gets silently
  // popup-blocked (same reasoning as InvoiceView.tsx's handleShareWhatsApp).
  // shareToWhatsAppAfter opens the tab synchronously, inside this click,
  // and redirects it once the token comes back.
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
        description: getApiErrorMessage(err, "Something went wrong. Please try again."),
        confirmText: "OK",
      });
    });
  };

  return (
    <main className="h-full p-4 m-4 md:p-10 min-w-0 rounded-3xl bg-blue-50 shadow">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h1 className="text-4xl sm:text-5xl lg:text-4xl leading-tight sm:leading-snug lg:leading-snug bg-linear-to-br from-blue-900 via-blue-800 to-slate-900 bg-clip-text text-transparent">
          Customer Details
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <TableSearchBar
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search customers..."
          />
          <Button onClick={() => openDialog("customer")}>+ Add Customer</Button>
        </div>
      </div>
      <Table<Customer>
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
        renderDetailPanel={(row) => <CustomerInvoicesList customerId={row.id} />}
        expandedRowId={expandedCustomerId}
        onExpandedRowIdChange={setExpandedCustomerId}
        paginationMode="server"
        rowCount={total}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        loading={loading}
      />
      <Dialog
        type="customer"
        title="Customer"
        children={<AddCustomer onSuccess={fetchCustomers} />}
        maxWidth="xs"
      />
    </main>
  );
};

export default Customers;
