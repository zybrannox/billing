import Table from "../../common/components/Table";
import type { GridColDef } from "@mui/x-data-grid";
import { useInvoiceStore, type Invoice } from "../../store/useInvoiceStore";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chip from "../../ui/Chip";
import { semanticChipSx } from "../../ui/chipStyles";
import { getSemanticColor } from "../../utils/colors";
import { formatDateTime } from "../../utils/dateFormatter";
import { Typography, Box, Button } from "@mui/material";
import { ReceiptLong, CheckCircle, Cancel, Visibility } from "@mui/icons-material";
import TableSearchBar from "../../common/components/TableSearchBar";
import CrudActions from "../../ui/Actions";

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
  const { invoices, fetchInvoices, updateInvoice } = useInvoiceStore();
  const [, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchInvoices().finally(() => setLoading(false));
  }, [fetchInvoices]);

  const handleMarkAsPaid = async (id: number) => {
    await updateInvoice(id, { status: "paid" });
  };

  const handleCancel = async (id: number) => {
    await updateInvoice(id, { status: "cancelled" });
  };

  return (
    <>
    <main className="h-full p-4 m-4 md:p-10 min-w-0 rounded-3xl bg-blue-50 shadow">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h1 className="text-4xl sm:text-5xl lg:text-4xl leading-tight sm:leading-snug lg:leading-snug bg-linear-to-br from-blue-900 via-blue-800 to-slate-900 bg-clip-text text-transparent">
          Billing & Invoices
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          {/* <TableSearchBar
            value={query}
            onChange={setQuery}
            placeholder="Search employees..."
          /> */}
          {/* <Button onClick={() => openDialog("user")}>+ Add Employee</Button> */}
        </div>
      </div>
        <Table<Invoice>
              rows={invoices}
              columns={columns}
              // onDelete={handleDeleteEmployee}
              renderActions={(_params, handlers) => [
                <CrudActions
                  key="crud"
                  edit
                  delete
                  onEdit={handlers.edit}
                  onDelete={handlers.delete}
                />,
              ]}
            />
      </main>
      <Box sx={{ p: 4, height: "100%", overflow: "auto" }}>

        <Box
          sx={{
            bgcolor: "background.paper",
            borderRadius: 4,
            p: 2,
            boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
            height: "calc(100% - 120px)",
          }}
        >
          <Table<Invoice>
            rows={invoices}
            columns={columns}
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
        </Box>
      </Box>
    </>
  );
};

export default BillingPage;
