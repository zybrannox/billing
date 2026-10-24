// Shared between the Dashboard's "Recent Deliveries" panel and the admin
// topbar's notification bell (NotificationBell.tsx) - both render the same
// underlying data (GET /dashboard/notifications/deliveries or the
// recent_deliveries field on /dashboard/summary), so the badge logic that
// turns a delivery into a label/color lives here once instead of drifting
// between two copies.

export interface RecentDelivery {
  id: number;
  project_type: string;
  customer_name: string | null;
  delivered_at: string;
  delivered_by: string | null;
  delivered_on_credit: boolean;
  payment_status: "pending" | "paid" | "cancelled" | null;
}

const INVOICE_STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: "var(--amber-100)", color: "var(--amber-800)", label: "Pending" },
  paid: { bg: "var(--green-100)", color: "var(--green-800)", label: "Paid" },
  cancelled: { bg: "var(--red-100)", color: "var(--red-800)", label: "Cancelled" },
};

// A credit delivery gets its own purple treatment while still unpaid -
// money out the door with nothing left to withhold, a different kind of
// risk than a normal pending invoice. Once it's actually settled it's
// shown as paid-and-was-on-credit rather than staying alarming forever.
export function getDeliveryBadge(delivery: RecentDelivery): { label: string; bg: string; color: string } {
  if (delivery.delivered_on_credit && delivery.payment_status === "pending") {
    return { label: "Credit — Unpaid", bg: "var(--violet-50)", color: "var(--violet-600)" };
  }
  if (delivery.delivered_on_credit && delivery.payment_status === "paid") {
    return { label: "Credit — Settled", bg: "var(--green-100)", color: "var(--green-800)" };
  }
  const style = INVOICE_STATUS_STYLES[delivery.payment_status ?? "pending"] ?? INVOICE_STATUS_STYLES.pending;
  return { label: style.label, bg: style.bg, color: style.color };
}

// What the notification bell's badge count actually means: not "how many
// deliveries happened recently" (that's just activity volume), but "how
// many need your attention" - i.e. still-unpaid credit deliveries.
export function countActionable(deliveries: RecentDelivery[]): number {
  return deliveries.filter((d) => d.delivered_on_credit && d.payment_status === "pending").length;
}
