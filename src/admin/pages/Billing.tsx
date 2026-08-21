import Table from "../../common/components/Table";
import type { GridColDef } from "@mui/x-data-grid";
import { useInvoiceStore, type Invoice } from "../../store/useInvoiceStore";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chip from "../../ui/Chip";
import { semanticChipSx } from "../../ui/chipStyles";
import { getSemanticColor } from "../../utils/colors";
import { formatDateTime } from "../../utils/dateFormatter";
import { Button } from "@mui/material";
import { CheckCircle, Cancel, Visibility } from "@mui/icons-material";

const columns: GridColDef[] = [
  {
    field: "invoice_number",
    headerName: "Invoice #",
    flex: 1,
  },
  {
    field: "amount",
    headerName: "Amount",
    flex: 1,
    valueFormatter: (value: number) => `₹${value?.toLocaleString()}`,
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

  useEffect(() => {
    fetchInvoices({
      page: paginationModel.page + 1,
      pageSize: paginationModel.pageSize,
    });
  }, [fetchInvoices, paginationModel]);

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
          <Button
            key="view"
            size="small"
            startIcon={<Visibility />}
            onClick={() => navigate(`/admin/invoices/${params.row.id}`)}
          >
            View
          </Button>,
          <Button
            key="pay"
            size="small"
            startIcon={<CheckCircle />}
            onClick={() => handleMarkAsPaid(params.row.id)}
            disabled={params.row.status === "paid"}
            color="success"
          >
            Paid
          </Button>,
          <Button
            key="cancel"
            size="small"
            startIcon={<Cancel />}
            onClick={() => handleCancel(params.row.id)}
            disabled={params.row.status !== "pending"}
            color="error"
          >
            Cancel
          </Button>,
        ]}
      />
    </main>
  );
};

export default BillingPage;
