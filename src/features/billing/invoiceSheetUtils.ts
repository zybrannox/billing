// Plain types/helpers for InvoiceSheet.tsx, split into their own file so
// that component file only exports the component (react-refresh's
// only-export-components rule requires this for fast refresh to work) -
// same reasoning as features/billing/itemLineUtils.ts.

import { formatRupees } from "../../format/money";

export type { InvoiceDetail, InvoiceItem, InvoicePayment } from "../../api/types";

export { formatRupeesFixed as formatCurrency } from "../../format/money";

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
    : `${formatRupees(item.rate)}${item.has_dimensions === false ? " each" : "/sq ft"}`;
