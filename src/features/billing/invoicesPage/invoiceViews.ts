import type { InvoiceViewName } from "../queries";

export type InvoiceViewChoice = "all" | InvoiceViewName;

export const VIEWS: { value: "all" | InvoiceViewName; label: string }[] = [
  { value: "all", label: "All Invoices" },
  { value: "unpaid", label: "Unpaid" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
];
