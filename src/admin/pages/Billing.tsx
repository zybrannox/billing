import Table from "../../common/components/Table";
import type { GridColDef } from "@mui/x-data-grid";
import { useInvoiceStore, type Invoice } from "../../store/useInvoiceStore";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chip from "../../ui/Chip";
import CrudActions from "../../ui/Actions";
import TableSearchBar from "../../common/components/TableSearchBar";
import { semanticChipSx } from "../../ui/chipStyles";
import { getSemanticColor } from "../../utils/colors";
import { formatDateTime } from "../../utils/dateFormatter";

const columns: GridColDef[] = [
  {
    field: "invoice_number",
    headerName: "Invoice #",
    flex: 1,
  },
  {
    // Otherwise this table shows nothing but auto-numbered invoices with
    // no way to tell whose order any of them are for.
    field: "customer_name",
    headerName: "Customer",
    flex: 1,
    renderCell: ({ value }) => (
      <span style={{ fontWeight: 600 }}>{value || "—"}</span>
    ),
  },
  {
    field: "project_type",
    headerName: "Project",
    flex: 1,
    valueFormatter: (value: string | null) => value || "—",
  },
  {
    field: "amount",
    headerName: "Amount",
    flex: 1,
    valueFormatter: (value: number) => `₹${value?.toLocaleString()}`,
  },
  {
    // Amount alone doesn't say whether anything's still owed - Balance
    // Due is the number that actually answers "is this settled".
    field: "balance_due",
    headerName: "Balance Due",
    flex: 1,
    renderCell: ({ value, row }) => (
      <span style={{ fontWeight: value > 0 ? 700 : 500, color: value > 0 ? "#B45309" : "#64748B" }}>
        {row.status === "cancelled" ? "—" : `₹${(value ?? 0).toLocaleString()}`}
      </span>
    ),
  },
  {
    field: "status",
    headerName: "Status",
    flex: 1,
    renderCell: ({ value }) => (
      <Chip
        label={value}
        sx={semanticChipSx(
          getSemanticColor(
            "printStatus",
            value === "paid"
              ? "Completed"
              : value === "pending"
                ? "In Progress"
                : "Delayed",
          ),
        )}
      />
    ),
  },
  {
    field: "created_at",
    headerName: "Date",
    flex: 1.5,
    valueFormatter: (value) => formatDateTime(value),
  },
];

const BillingPage = () => {
  const {
    invoices,
    invoicesTotal,
    invoicesLoading,
    fetchInvoices,
    updateInvoice,
  } = useInvoiceStore();
  const navigate = useNavigate();
  const [paginationModel, setPaginationModel] = useState({
    page: 0, // MUI DataGrid pages are 0-indexed; the API is 1-indexed.
    pageSize: 20,
  });
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce the search box so every keystroke doesn't fire a request -
  // same pattern as Customers.tsx/Projects.tsx.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // A new search should land back on page 1.
  useEffect(() => {
    setPaginationModel((prev) => (prev.page === 0 ? prev : { ...prev, page: 0 }));
  }, [debouncedSearch]);

  useEffect(() => {
    fetchInvoices({
      page: paginationModel.page + 1,
      pageSize: paginationModel.pageSize,
      search: debouncedSearch,
    });
  }, [fetchInvoices, paginationModel, debouncedSearch]);

  const handleMarkAsPaid = async (id: number) => {
    await updateInvoice(id, { status: "paid" });
  };

  const handleCancel = async (id: number) => {
    await updateInvoice(id, { status: "cancelled" });
  };

  return (
    <main className="h-full p-4 m-4 md:p-10 min-w-0 rounded-3xl bg-blue-50 shadow">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h1 className="text-4xl sm:text-5xl lg:text-4xl leading-tight sm:leading-snug lg:leading-snug bg-linear-to-br from-blue-900 via-blue-800 to-slate-900 bg-clip-text text-transparent">
          Billing & Invoices
        </h1>
        <TableSearchBar
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search by customer, project or invoice #..."
        />
      </div>
      <Table<Invoice>
        rows={invoices}
        columns={columns}
        loading={invoicesLoading}
        paginationMode="server"
        rowCount={invoicesTotal}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={[20, 50, 100]}
        renderActions={(params) => [
          <CrudActions
            key="crud"
            viewInvoice
            markPaid
            cancelInvoice
            invoiceStatus={params.row.status}
            onViewInvoice={() => navigate(`/admin/invoices/${params.row.id}`)}
            onMarkPaid={() => handleMarkAsPaid(params.row.id)}
            onCancelInvoice={() => handleCancel(params.row.id)}
          />,
        ]}
      />
    </main>
  );
};

export default BillingPage;
