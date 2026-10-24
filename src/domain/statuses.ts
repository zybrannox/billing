// Status vocabularies shared by every screen that shows or changes them. The
// colour of each status is in utils/colors.ts (getSemanticColor), so a status
// looks the same in a list, a card and a dialog.

export type InvoiceStatus = "pending" | "paid" | "cancelled";

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  cancelled: "Cancelled",
};

export type QuotationStatus = "pending" | "accepted" | "rejected" | "converted";

export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  pending: "Awaiting Response",
  accepted: "Accepted",
  rejected: "Rejected",
  converted: "Converted to Invoice",
};
