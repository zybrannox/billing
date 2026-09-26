import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { portalApiService } from "../../api/portalService";
import Chip from "../../ui/Chip";
import { semanticChipSx } from "../../ui/chipStyles";
import { getSemanticColor } from "../../utils/colors";
import { formatDateTime } from "../../utils/dateFormatter";

interface OrderDetail {
  id: number;
  project_type: string;
  description: string | null;
  print_status: string;
  priority: string;
  client_status: string;
  start_date: string | null;
  delivery_date: string | null;
  customer_name: string | null;
  design_completed_at: string | null;
  print_completed_at: string | null;
  delivered_at: string | null;
}

export default function PortalOrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    try {
      const data = await portalApiService.get<OrderDetail>(`/portal/orders/${id}`);
      setOrder(data);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <p className="text-slate-500">Loading...</p>;

  if (notFound || !order) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <p className="text-slate-700 font-semibold">Order not found.</p>
        <Link to="/portal/orders" className="text-blue-700 text-sm font-semibold">
          Back to orders
        </Link>
      </div>
    );
  }

  const milestones = [
    { label: "Design completed", at: order.design_completed_at },
    { label: "Print completed", at: order.print_completed_at },
    { label: "Delivered", at: order.delivered_at },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-2xl">
      <Link to="/portal/orders" className="text-blue-700 text-sm font-semibold">
        ← Back to orders
      </Link>

      <div className="flex items-center justify-between mt-4 mb-2">
        <h1 className="text-2xl font-bold text-slate-900">{order.project_type}</h1>
        <Chip label={order.print_status} sx={semanticChipSx(getSemanticColor("printStatus", order.print_status))} />
      </div>

      {order.description && <p className="text-slate-600 mb-4">{order.description}</p>}

      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div>
          <div className="text-slate-500">Start date</div>
          <div className="font-semibold text-slate-900">{formatDateTime(order.start_date)}</div>
        </div>
        <div>
          <div className="text-slate-500">Expected delivery</div>
          <div className="font-semibold text-slate-900">{formatDateTime(order.delivery_date)}</div>
        </div>
      </div>

      <h2 className="text-sm font-bold text-slate-900 mb-2">Progress</h2>
      <div className="space-y-1.5">
        {milestones.map((m) => (
          <div key={m.label} className="flex items-center justify-between text-sm">
            <span className="text-slate-600">{m.label}</span>
            <span className={m.at ? "text-emerald-700 font-semibold" : "text-slate-400"}>
              {m.at ? formatDateTime(m.at) : "Not yet"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
