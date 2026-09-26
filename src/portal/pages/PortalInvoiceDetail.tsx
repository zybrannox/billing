import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { portalApiService } from "../../api/portalService";
import InvoiceSheet from "../../admin/components/InvoiceSheet";
import type { InvoiceDetail } from "../../admin/components/invoiceSheetUtils";

// Read-only - reuses the same printable InvoiceSheet the staff app uses
// (admin/pages/InvoiceView.tsx) rather than building a second invoice
// layout, just fetched via /portal/invoices/{id} (ownership-checked
// server-side, see app/portal/service.py) instead of the staff-only route.
export default function PortalInvoiceDetail() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    try {
      const data = await portalApiService.get<InvoiceDetail>(`/portal/invoices/${id}`);
      setInvoice(data);
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

  if (notFound || !invoice) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <p className="text-slate-700 font-semibold">Invoice not found.</p>
        <Link to="/portal/billing" className="text-blue-700 text-sm font-semibold">
          Back to billing
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/portal/billing" className="text-blue-700 text-sm font-semibold">
        ← Back to billing
      </Link>
      <div className="mt-4">
        <InvoiceSheet invoice={invoice} />
      </div>
    </div>
  );
}
