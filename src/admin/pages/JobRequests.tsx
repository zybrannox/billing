import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiService } from "../../api/service";
import Chip from "../../ui/Chip";
import { semanticChipSx } from "../../ui/chipStyles";
import Button from "../../ui/Button";
import { formatDateTime } from "../../utils/dateFormatter";
import { useConfirmDialogStore } from "../../hooks/useconfirmDialogStore";

interface JobRequestFile {
  id: number;
  original_name: string | null;
}

interface JobRequestItem {
  id: number;
  customer_id: number;
  customer_name: string | null;
  company_name: string | null;
  description: string;
  status: "pending" | "converted" | "rejected";
  created_at: string;
  project_id: number | null;
  rejection_reason: string | null;
  files: JobRequestFile[];
}

interface JobRequestListResponse {
  items: JobRequestItem[];
  total: number;
}

const STATUS_META: Record<string, { color: string; label: string }> = {
  pending: { color: "var(--amber-600)", label: "Pending" },
  converted: { color: "var(--emerald-600)", label: "Converted" },
  rejected: { color: "var(--rose-600)", label: "Rejected" },
};

// Staff's intake queue for client-submitted work (see app/job_requests) -
// a plain list rather than the DataGrid-based Table used elsewhere, since
// this surface is small in scope (accept/reject, not inline-editable rows).
export default function JobRequests() {
  const navigate = useNavigate();
  const { showDialog, closeDialog, setLoading } = useConfirmDialogStore();
  const [items, setItems] = useState<JobRequestItem[]>([]);
  const [loading, setLoadingState] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = () => {
    setLoadingState(true);
    apiService
      .get<JobRequestListResponse>("/job-requests/", { params: { page: 1, page_size: 50 } })
      .then((res) => setItems(res.items))
      .finally(() => setLoadingState(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleConvert = (item: JobRequestItem) => {
    showDialog({
      title: "Accept this job request?",
      description: "This creates a real project from the client's request, using the same files they attached.",
      confirmText: "Accept & Create Project",
      onConfirm: async () => {
        try {
          setLoading(true);
          setBusyId(item.id);
          const updated = await apiService.post<JobRequestItem>(`/job-requests/${item.id}/convert`);
          closeDialog();
          load();
          if (updated.project_id) {
            navigate(`/admin/projects?projectId=${updated.project_id}`);
          }
        } finally {
          setLoading(false);
          setBusyId(null);
        }
      },
    });
  };

  const handleReject = async (item: JobRequestItem) => {
    const reason = window.prompt("Reason for rejecting this request (shown to the client's history):");
    if (reason === null) return;
    setBusyId(item.id);
    try {
      await apiService.post(`/job-requests/${item.id}/reject`, { reason: reason || "Not accepted" });
      load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="h-full p-4 m-4 md:p-10 min-w-0 rounded-3xl bg-blue-50 shadow">
      <h1 className="text-4xl sm:text-5xl lg:text-4xl leading-tight sm:leading-snug lg:leading-snug bg-linear-to-br from-blue-900 via-blue-800 to-slate-900 bg-clip-text text-transparent mb-6">
        Job Requests
      </h1>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-slate-500">No job requests from clients yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const meta = STATUS_META[item.status] ?? STATUS_META.pending;
            const busy = busyId === item.id;
            return (
              <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-900">
                      {item.customer_name}
                      {item.company_name && (
                        <span className="text-slate-500 font-normal"> · {item.company_name}</span>
                      )}
                    </div>
                    <p className="text-slate-700 mt-1">{item.description}</p>
                    {item.files.length > 0 && (
                      <div className="text-xs text-slate-500 mt-1">
                        {item.files.length} file{item.files.length === 1 ? "" : "s"} attached
                      </div>
                    )}
                    <div className="text-xs text-slate-400 mt-1">
                      Submitted {formatDateTime(item.created_at)}
                    </div>
                    {item.status === "rejected" && item.rejection_reason && (
                      <div className="text-sm text-rose-700 mt-1">Reason: {item.rejection_reason}</div>
                    )}
                  </div>
                  <Chip label={meta.label} sx={semanticChipSx(meta.color)} />
                </div>

                {item.status === "pending" && (
                  <div className="flex gap-2 mt-3">
                    <Button size="small" disabled={busy} onClick={() => handleConvert(item)}>
                      Accept & Create Project
                    </Button>
                    <Button size="small" variantColor="outline" disabled={busy} onClick={() => handleReject(item)}>
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
