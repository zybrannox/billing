// Plain types for QuotationSheet.tsx and the quotation views, in their own
// file for the same react-refresh reason as invoiceSheetUtils.ts.
import type { InvoiceItem } from "./invoiceSheetUtils";

export type QuotationStatus = "pending" | "accepted" | "rejected" | "converted";

// Quotation lines have exactly the invoice line shape (same compute_line
// maths and flags on the backend).
export type QuotationItem = InvoiceItem;

export interface QuotationDetail {
  id: number;
  quotation_number: string;
  project_type: string;
  subtotal: number;
  discount_amount: number;
  amount: number;
  status: QuotationStatus;
  valid_until: string | null;
  created_at: string;
  converted_project_id: number | null;
  converted_invoice_id: number | null;
  customer: {
    first_name: string;
    last_name: string;
    contact_number: string;
    email: string | null;
    company_name?: string | null;
    company_address?: string | null;
  } | null;
  items: QuotationItem[];
}

export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  pending: "Awaiting Response",
  accepted: "Accepted",
  rejected: "Rejected",
  converted: "Converted to Invoice",
};
