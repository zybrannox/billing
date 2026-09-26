import { useEffect, useMemo, useState } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { useNavigate } from "react-router-dom";
import { portalApiService } from "../../api/portalService";
import Table from "../../common/components/Table";
import Chip from "../../ui/Chip";
import { semanticChipSx } from "../../ui/chipStyles";
import { getSemanticColor } from "../../utils/colors";
import { formatDateTime } from "../../utils/dateFormatter";
import { formatCurrency } from "../../admin/components/invoiceSheetUtils";

interface Invoice {
  id: number;
  invoice_number: string;
  amount: number;
  status: string;
  balance_due: number;
  created_at: string;
  due_date: string | null;
  customer_name: string | null;
  project_type: string | null;
}

interface InvoiceListResponse {
  items: Invoice[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export default function PortalBilling() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await portalApiService.get<InvoiceListResponse>("/portal/invoices", {
        params: { page: paginationModel.page + 1, page_size: paginationModel.pageSize },
      });
      setInvoices(res.items);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationModel]);

  const rows = useMemo(() => invoices.map((i) => ({ ...i, id: i.id })), [invoices]);

  const columns: GridColDef[] = useMemo(
    () => [
      { field: "invoice_number", headerName: "Invoice #", flex: 1 },
      { field: "project_type", headerName: "For", flex: 1 },
      { field: "customer_name", headerName: "Billed to", flex: 1 },
      {
        field: "amount",
        headerName: "Amount",
        flex: 0.8,
        valueFormatter: (value) => formatCurrency(value),
      },
      {
        field: "status",
        headerName: "Status",
        flex: 0.8,
        renderCell: ({ value }) => (
          <Chip label={value} sx={semanticChipSx(getSemanticColor("printStatus", value === "paid" ? "Completed" : "Pending"))} />
        ),
      },
      {
        field: "due_date",
        headerName: "Due",
        flex: 1,
        valueFormatter: (value) => formatDateTime(value),
      },
    ],
    [],
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Billing</h1>
      <Table<Invoice>
        rows={rows}
        columns={columns}
        hideActionsColumn
        onRowSelect={(row) => navigate(`/portal/billing/${row.id}`)}
        paginationMode="server"
        rowCount={total}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        loading={loading}
      />
    </div>
  );
}
