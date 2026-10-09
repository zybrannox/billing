// Plain types/helpers for InvoiceSheet.tsx, split into their own file so
// that component file only exports the component (react-refresh's
// only-export-components rule requires this for fast refresh to work) -
// same reasoning as common/components/itemLineUtils.ts.

export interface InvoiceItem {
  id: number;
  description: string | null;
  width: number;
  height: number;
  unit: "ft" | "in";
  sq_ft: number;
  rate: number;
  pieces: number;
  total: number;
  // True when this line's Total was typed directly at creation (see
  // GenerateInvoice.tsx) - `rate` is still populated (back-derived as
  // total ÷ area) but was never actually entered, so it's hidden here
  // rather than shown as if it were a real quoted rate.
  is_manual_total: boolean;
  // False for an area-less "Others" line (billed rate x pieces) - absent on
  // older payloads, which are all measured.
  has_dimensions?: boolean;
}

export interface InvoiceDetail {
  id: number;
  project_id: number;
  invoice_number: string;
  subtotal: number;
  discount_amount: number;
  amount: number;
  status: "pending" | "paid" | "cancelled";
  created_at: string;
  due_date: string | null;
  advance_amount: number;
  payment_method: string | null;
  payment_reference: string | null;
  balance_due: number;
  project: {
    id: number;
    project_type: string;
    description: string | null;
    start_date: string | null;
    delivery_date: string | null;
  } | null;
  customer: {
    first_name: string;
    last_name: string;
    contact_number: string;
    email: string;
  } | null;
  items: InvoiceItem[];
}

export const formatCurrency = (val: number) =>
  `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Feet uses the ' mark, inches uses " - whichever the line was actually
// measured in (see GenerateInvoice.tsx's per-row unit toggle), not always
// feet regardless of what was entered.
export const formatDimension = (value: number, unit: "ft" | "in") =>
  `${value}${unit === "in" ? '"' : "'"}`;

type MeasuredLine = {
  width: number;
  height: number;
  unit: "ft" | "in";
  sq_ft: number;
  rate: number;
  pieces: number;
  is_manual_total: boolean;
  has_dimensions?: boolean;
};

// The muted second line under a printed line item, and its rate label -
// shared by the invoice and quotation sheets. An "Others" line has no
// dimensions to show: just its quantity, and a per-piece rate.
export const lineItemMeta = (item: MeasuredLine) =>
  item.has_dimensions === false
    ? `Qty ${item.pieces}`
    : `${formatDimension(item.width, item.unit)} × ${formatDimension(item.height, item.unit)} (${item.sq_ft} sq ft) · Qty ${item.pieces}`;

export const lineItemRate = (item: MeasuredLine) =>
  item.is_manual_total
    ? undefined
    : `₹${item.rate.toLocaleString("en-IN")}${item.has_dimensions === false ? " each" : "/sq ft"}`;
