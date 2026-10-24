// The renderer-facing shape of a printed document. Invoices and quotations
// (and any future document type - receipt, delivery challan) are converted
// into this by an adapter (documentAdapters.ts); DocumentSheet only ever
// sees this, so it has no idea which kind of document it's drawing.

export interface DocumentParty {
  name: string;
  lines: string[];
}

export interface DocumentLine {
  description: string;
  // The muted line under the description: dimensions, "@ 50 per unit", etc.
  detail?: string;
  qty: string;
  // "-" when there's no meaningful unit rate (a total typed directly).
  rate: string;
  amount: string;
}

export interface DocumentPayment {
  date: string;
  method: string;
  reference: string;
  amount: string;
}

export interface DocumentTotals {
  subtotal: string;
  discount?: string;
  // Present for a document that tracks payments (an invoice with money
  // received): shows Total + Amount paid above the final bar.
  total?: string;
  paid?: string;
  finalLabel: string;
  finalAmount: string;
}

export interface DocumentData {
  label: string; // "INVOICE" | "QUOTATION"
  number: string;
  dates: { label: string; value: string }[];
  billedToLabel: string; // "BILLED TO" | "QUOTED TO"
  billedTo: DocumentParty;
  lines: DocumentLine[];
  totals: DocumentTotals;
  terms?: string;
  payments: DocumentPayment[];
  // A short banner under the title for non-standard states ("Cancelled").
  notice?: string;
}
