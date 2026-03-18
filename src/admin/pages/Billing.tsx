import Table from "../../common/components/Table";
import type { GridColDef } from "@mui/x-data-grid";
import { useInvoiceStore, type Invoice } from "../../store/useInvoiceStore";
import { useEffect, useState } from "react";
import Chip from "../../ui/Chip";
import { semanticChipSx } from "../../ui/chipStyles";
import { getSemanticColor } from "../../utils/colors";
import { formatDateTime } from "../../utils/dateFormatter";
import { Typography, Box, Button } from "@mui/material";
import { ReceiptLong, CheckCircle, Cancel } from "@mui/icons-material";

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
        label={value.toUpperCase()}
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
    <Box sx={{ p: 4, height: "100%", overflow: "auto" }}>
      <Box
        sx={{
          mb: 4,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              background: "linear-gradient(45deg, #1e3a8a, #3b82f6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Billing & Invoices
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Manage your financial records and project payments
          </Typography>
        </Box>
        <ReceiptLong
          sx={{ fontSize: 60, color: "primary.main", opacity: 0.2 }}
        />
      </Box>

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
  );
};

export default BillingPage;
