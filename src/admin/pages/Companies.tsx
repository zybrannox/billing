import type { GridColDef, GridRowId } from "@mui/x-data-grid";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CrudActions from "../../ui/Actions";
import Button from "../../ui/Button";
import Table from "../../common/components/Table";
import TableSearchBar from "../../common/components/TableSearchBar";
import Dialog from "../../ui/Dialog";
import AddCompany from "../../common/pages/AddCompany";
import CompanyInvoicesList from "../components/CompanyInvoicesList";
import { useDialogStore } from "../../store/useDialogStore";
import { useConfirmDialogStore } from "../../hooks/useconfirmDialogStore";
import { apiService } from "../../api/service";

interface Company {
  id: number;
  name: string;
  billing_email: string | null;
  phone: string | null;
  payment_terms_days: number;
  credit_limit: number | null;
}

interface CompanyListResponse {
  items: Company[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

const buildBaseColumns = (): GridColDef[] => [
  { field: "name", headerName: "Company Name", flex: 1.4, editable: true },
  { field: "billing_email", headerName: "Billing Email", flex: 1.3, editable: true },
  { field: "phone", headerName: "Phone", flex: 1, editable: true },
  {
    field: "payment_terms_days",
    headerName: "Payment Terms",
    flex: 1,
    editable: true,
    type: "number",
    valueFormatter: (value: number) => (value ? `NET-${value}` : "Due on receipt"),
  },
  {
    field: "credit_limit",
    headerName: "Credit Limit",
    flex: 1,
    editable: true,
    type: "number",
    valueFormatter: (value: number | null) => (value != null ? `₹${value.toLocaleString("en-IN")}` : "No limit"),
  },
];

const Companies = () => {
  const navigate = useNavigate();
  const { openDialog } = useDialogStore();
  const { showDialog, closeDialog, setLoading } = useConfirmDialogStore();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoadingState] = useState(false);
  // Which company's invoice peek panel (see CompanyInvoicesList) is open -
  // true accordion, one at a time, same pattern as Customers.tsx.
  const [expandedCompanyId, setExpandedCompanyId] = useState<GridRowId | null>(null);

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

  const fetchCompanies = async () => {
    setLoadingState(true);
    try {
      const res = await apiService.get<CompanyListResponse>("/companies", {
        params: {
          page: paginationModel.page + 1,
          page_size: paginationModel.pageSize,
          search: debouncedSearch || undefined,
        },
      });
      setCompanies(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error("Error fetching companies", err);
    } finally {
      setLoadingState(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationModel, debouncedSearch]);

  const rows = useMemo(() => companies.map((c) => ({ ...c, id: c.id })), [companies]);

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
      ...buildBaseColumns(),
    ],
    [rows, paginationModel],
  );

  const processRowUpdate = async (newRow: Company, oldRow: Company) => {
    const payload: Partial<Company> = {
      name: newRow.name,
      billing_email: newRow.billing_email,
      phone: newRow.phone,
      payment_terms_days: newRow.payment_terms_days,
      credit_limit: newRow.credit_limit,
    };

    const hasChanges = Object.keys(payload).some(
      (key) => payload[key as keyof Company] !== oldRow[key as keyof Company],
    );

    if (!hasChanges) return oldRow;

    await apiService.put(`/companies/${newRow.id}`, payload);
    return newRow;
  };

  const handleDelete = (id: number) => {
    showDialog({
      title: "Delete Company?",
      description: "Its contacts stay as ordinary customers - only the company record itself is removed. This action cannot be undone.",
      confirmText: "Delete",
      isDestructive: true,
      onConfirm: async () => {
        try {
          setLoading(true);
          await apiService.delete(`/companies/${id}`);
          await fetchCompanies();
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
          Companies
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <TableSearchBar
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search companies..."
          />
          <Button onClick={() => openDialog("company")}>+ Add Company</Button>
        </div>
      </div>
      <Table<Company>
        rows={rows}
        columns={columns}
        processRowUpdate={processRowUpdate}
        renderActions={(params, handlers) => [
          <CrudActions
            key="crud"
            edit
            delete
            viewCompany
            onEdit={handlers.edit}
            onDelete={() => handleDelete(params.row.id)}
            onViewCompany={() => navigate(`/admin/companies/${params.row.id}`)}
          />,
        ]}
        renderDetailPanel={(row) => <CompanyInvoicesList companyId={row.id} mode="peek" />}
        expandedRowId={expandedCompanyId}
        onExpandedRowIdChange={setExpandedCompanyId}
        paginationMode="server"
        rowCount={total}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        loading={loading}
      />
      <Dialog
        type="company"
        title="Company"
        children={<AddCompany onSuccess={fetchCompanies} />}
        maxWidth="sm"
      />
    </main>
  );
};

export default Companies;
