import { useEffect, useMemo, useState } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { useNavigate } from "react-router-dom";
import { portalApiService } from "../../api/portalService";
import Table from "../../common/components/Table";
import Chip from "../../ui/Chip";
import { semanticChipSx } from "../../ui/chipStyles";
import { getSemanticColor } from "../../utils/colors";
import { formatDateTime } from "../../utils/dateFormatter";

interface Order {
  id: number;
  project_type: string;
  description: string | null;
  print_status: string;
  start_date: string | null;
  delivery_date: string | null;
  customer_name: string | null;
}

interface OrderListResponse {
  items: Order[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// A client's own orders (or their whole company's - the backend decides
// which based on whether the logged-in contact's Customer.company_id is
// set, see app/portal/service.py) - read-only, no row actions.
export default function PortalOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await portalApiService.get<OrderListResponse>("/portal/orders", {
        params: { page: paginationModel.page + 1, page_size: paginationModel.pageSize },
      });
      setOrders(res.items);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationModel]);

  const rows = useMemo(() => orders.map((o) => ({ ...o, id: o.id })), [orders]);

  const columns: GridColDef[] = useMemo(
    () => [
      { field: "project_type", headerName: "Order", flex: 1.2 },
      { field: "customer_name", headerName: "For", flex: 1 },
      {
        field: "print_status",
        headerName: "Status",
        flex: 1,
        renderCell: ({ value }) => (
          <Chip label={value} sx={semanticChipSx(getSemanticColor("printStatus", value))} />
        ),
      },
      {
        field: "delivery_date",
        headerName: "Delivery",
        flex: 1,
        valueFormatter: (value) => formatDateTime(value),
      },
    ],
    [],
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">My Orders</h1>
      <Table<Order>
        rows={rows}
        columns={columns}
        hideActionsColumn
        onRowSelect={(row) => navigate(`/portal/orders/${row.id}`)}
        paginationMode="server"
        rowCount={total}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        loading={loading}
      />
    </div>
  );
}
