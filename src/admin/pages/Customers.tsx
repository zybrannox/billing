import type { GridColDef } from "@mui/x-data-grid";
import { useEffect, useMemo, useState } from "react";
import CrudActions from "../../ui/Actions";
import Button from "../../ui/Button";
import Table from "../../common/components/Table";
import TableSearchBar from "../../common/components/TableSearchBar";
import Dialog from "../../ui/Dialog";
import AddCustomer from "../../common/pages/AddCustomer";
import { useDialogStore } from "../../store/useDialogStore";
import { useConfirmDialogStore } from "../../hooks/useconfirmDialogStore";
import { apiService } from "../../api/service";

interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  contact_number: string;
  email: string;
}

interface CustomerListResponse {
  items: Customer[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

const baseColumns: GridColDef[] = [
  { field: "first_name", headerName: "First Name", flex: 1, editable: true },
  { field: "last_name", headerName: "Last Name", flex: 1, editable: true },
  { field: "contact_number", headerName: "Contact Number", flex: 1, editable: true },
  { field: "email", headerName: "Email", flex: 1.5, editable: true },
];

const Customers = () => {
  const { openDialog } = useDialogStore();
  const { showDialog, closeDialog, setLoading } = useConfirmDialogStore();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoadingState] = useState(false);

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

  const rows = useMemo(() => customers.map((c) => ({ ...c, id: c.id })), [customers]);

  // Server-side pagination means `rows` only holds the current page, so the
  // displayed SI.NO offsets by the page start rather than the customer's id
  // (which has gaps from deletions) - keeps it sequential 1-to-n overall.
  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: "serialNo",
        headerName: "SI.NO",
        width: 90,
        sortable: false,
        filterable: false,
        valueGetter: (_value, row) =>
          paginationModel.page * paginationModel.pageSize +
          rows.findIndex((r) => r.id === row.id) +
          1,
      },
      ...baseColumns,
    ],
    [rows, paginationModel],
  );

  const processRowUpdate = async (newRow: Customer, oldRow: Customer) => {
    const payload: Partial<Customer> = {
      first_name: newRow.first_name,
      last_name: newRow.last_name,
      contact_number: newRow.contact_number,
      email: newRow.email,
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
            onEdit={handlers.edit}
            onDelete={() => handleDelete(params.row.id)}
          />,
        ]}
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
