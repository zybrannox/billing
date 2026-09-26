import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { portalApiService } from "../../api/portalService";
import Chip from "../../ui/Chip";
import { semanticChipSx } from "../../ui/chipStyles";
import { formatDateTime } from "../../utils/dateFormatter";

interface JobRequestItem {
  id: number;
  customer_name: string | null;
  description: string;
  status: "pending" | "converted" | "rejected";
  created_at: string;
  rejection_reason: string | null;
}

interface JobRequestListResponse {
  items: JobRequestItem[];
  total: number;
}

const STATUS_META: Record<string, { color: string; label: string }> = {
  pending: { color: "var(--amber-600)", label: "Pending Review" },
  converted: { color: "var(--emerald-600)", label: "Accepted" },
  rejected: { color: "var(--rose-600)", label: "Not Accepted" },
};

export default function PortalJobRequests() {
  const [items, setItems] = useState<JobRequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    portalApiService
      .get<JobRequestListResponse>("/job-requests/mine", { params: { page: 1, page_size: 50 } })
      .then((res) => active && setItems(res.items))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">My Requests</h1>
        <Link
          to="/portal/submit-job"
          className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-blue-900 text-white"
        >
          + Submit a Job
        </Link>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-slate-500">You haven't submitted any job requests yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const meta = STATUS_META[item.status] ?? STATUS_META.pending;
            return (
              <div key={item.id} className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-slate-900 font-medium flex-1">{item.description}</p>
                  <Chip label={meta.label} sx={semanticChipSx(meta.color)} />
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  Submitted {formatDateTime(item.created_at)}
                </div>
                {item.status === "rejected" && item.rejection_reason && (
                  <div className="text-sm text-rose-700 mt-2">Reason: {item.rejection_reason}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
