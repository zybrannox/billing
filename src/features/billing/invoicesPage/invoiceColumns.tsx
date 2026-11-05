import { Box } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import type { Invoice } from "../../../api/types";
import { formatDate } from "../../../format/date";
import { formatRupees } from "../../../format/money";
import InvoiceStatusChip from "../InvoiceStatusChip";

const numberCell = (value: number, emphasis = false) => (
  <Box component="span" sx={{ fontWeight: emphasis ? 600 : 500, color: "var(--slate-900)", fontVariantNumeric: "tabular-nums" }}>
    {formatRupees(value)}
  </Box>
);

export const INVOICE_COLUMNS: GridColDef<Invoice>[] = [
  { field: "created_at", headerName: "Date", width: 115, sortable: false, renderCell: ({ value }) => formatDate(value) },
  {
    field: "invoice_number",
    headerName: "Invoice #",
    width: 150,
    sortable: false,
    renderCell: ({ value }) => <Box component="span" sx={{ fontWeight: 600, color: "var(--blue-700)" }}>{value}</Box>,
  },
  {
    field: "customer_name",
    headerName: "Customer",
    flex: 1.2,
    minWidth: 150,
    sortable: false,
    renderCell: ({ value }) => <Box component="span" sx={{ fontWeight: 600 }}>{value ?? "—"}</Box>,
  },
  {
    field: "project_type",
    headerName: "Job",
    flex: 1,
    minWidth: 120,
    sortable: false,
    renderCell: ({ value }) => <Box component="span" sx={{ color: "var(--slate-600)" }}>{value || "—"}</Box>,
  },
  { field: "status", headerName: "Status", width: 165, sortable: false, renderCell: ({ row }) => <InvoiceStatusChip invoice={row} /> },
  { field: "due_date", headerName: "Due Date", width: 115, sortable: false, renderCell: ({ value }) => (value ? formatDate(value) : "—") },
  { field: "amount", headerName: "Amount", width: 115, sortable: false, align: "right", headerAlign: "right", renderCell: ({ value }) => numberCell(value) },
  { field: "balance_due", headerName: "Balance", width: 115, sortable: false, align: "right", headerAlign: "right", renderCell: ({ row }) => numberCell(row.status === "pending" ? row.balance_due : 0, true) },
];
