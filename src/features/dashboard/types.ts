import { type RecentDelivery } from "../../domain/deliveryStatus";

export type Granularity = "day" | "week" | "month" | "year";

export interface DashboardStats {
  total_customers: number;
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  delivered_projects: number;
  total_revenue: number;
  revenue_this_month: number;
  outstanding_balance: number;
  pending_invoices: number;
  overdue_invoices: number;
}

export interface StatusCount {
  label: string;
  count: number;
}

export interface RevenuePoint {
  period: string;
  revenue: number;
}

export interface RecentInvoice {
  id: number;
  invoice_number: string;
  customer_name: string | null;
  project_type: string | null;
  amount: number;
  status: "pending" | "paid" | "cancelled";
  created_at: string;
}

export interface AttentionProject {
  id: number;
  project_type: string;
  customer_name: string | null;
  priority: string;
  print_status: string;
  delivery_date: string | null;
  is_overdue: boolean;
  // True when this row is here because it was delivered on credit and is
  // still unpaid - the goods are already gone, so this is the most
  // time-sensitive reason to be on this list, distinct from a delivery
  // deadline that hasn't happened yet.
  is_credit_unpaid: boolean;
}

export interface TopCustomer {
  customer_name: string;
  total_spent: number;
  order_count: number;
}

export interface DashboardSummary {
  stats: DashboardStats;
  project_status_breakdown: StatusCount[];
  priority_breakdown: StatusCount[];
  revenue_trend: RevenuePoint[];
  recent_invoices: RecentInvoice[];
  attention_projects: AttentionProject[];
  recent_deliveries: RecentDelivery[];
  top_customers: TopCustomer[];
}
