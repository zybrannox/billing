import { formatDimension, type InvoiceDetail } from "../admin/components/invoiceSheetUtils";
import type { DocumentSettings } from "./documentSettings";
import type { DocumentData, DocumentLine, DocumentParty, DocumentPayment } from "./documentTypes";

// Adapters: turn a domain object (an invoice, a quotation) into the generic
// DocumentData the renderer draws. All the document-specific wording and
// arithmetic lives here, so supporting another document type means writing
// one more adapter - DocumentSheet doesn't change.

const NUMBER = { minimumFractionDigits: 2, maximumFractionDigits: 2 } as const;
const num = (v: number) => v.toLocaleString("en-IN", NUMBER);
const money = (v: number) => `INR ${num(v)}`;

export const longDate = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
};

interface ItemLike {
  description: string | null;
  width: number;
  height: number;
  unit: "ft" | "in";
  sq_ft: number;
  rate: number;
  pieces: number;
  total: number;
  is_manual_total: boolean;
  has_dimensions?: boolean;
}

interface CustomerLike {
  first_name: string;
  last_name: string;
  contact_number: string;
  email: string | null;
  company_name?: string | null;
  company_address?: string | null;
}

const splitLines = (text: string | null | undefined) =>
  (text ?? "").split("\n").map((l) => l.trim()).filter(Boolean);

const partyFromCustomer = (customer: CustomerLike | null): DocumentParty => {
  if (!customer) return { name: "—", lines: [] };
  return {
    name: `${customer.first_name} ${customer.last_name}`.trim(),
    lines: [
      ...(customer.company_name ? [customer.company_name] : []),
      ...splitLines(customer.company_address),
      ...(customer.contact_number ? [customer.contact_number] : []),
      ...(customer.email ? [customer.email] : []),
    ],
  };
};

// "10' x 30' (300 sq ft) @ 10 per sq ft" for a measured line,
// "@ 50 per unit" for an "Others" one; the rate is left off when the line's
// total was typed directly (the stored rate is back-derived, never quoted).
const lineFromItem = (item: ItemLike): DocumentLine => {
  const measured = item.has_dimensions !== false;
  const atRate = item.is_manual_total
    ? ""
    : ` @ ${item.rate.toLocaleString("en-IN")} per ${measured ? "sq ft" : "unit"}`;
  const dims = measured
    ? `${formatDimension(item.width, item.unit)} x ${formatDimension(item.height, item.unit)} (${item.sq_ft} sq ft)`
    : "";
  const detail = `${dims}${atRate}`.trim();

  return {
    description: item.description || "Standard Item",
    detail: detail || undefined,
    qty: String(item.pieces),
    rate: item.is_manual_total ? "-" : num(item.rate),
    amount: num(item.total),
  };
};

const paymentsOf = (invoice: InvoiceDetail): DocumentPayment[] =>
  (invoice.payments ?? []).map((p) => ({
    date: longDate(p.paid_at),
    method: p.amount < 0 ? "Adjustment" : (p.payment_method ?? "-"),
    reference: p.payment_reference || "-",
    amount: p.amount < 0 ? `-${money(Math.abs(p.amount))}` : money(p.amount),
  }));

export function invoiceToDocument(invoice: InvoiceDetail, settings: DocumentSettings): DocumentData {
  const hasPayment = invoice.advance_amount > 0;
  return {
    label: "INVOICE",
    number: invoice.invoice_number,
    dates: [
      { label: "Issue date", value: longDate(invoice.created_at) },
      ...(invoice.project?.delivery_date
        ? [{ label: "Delivery date", value: longDate(invoice.project.delivery_date) }]
        : []),
      ...(invoice.due_date ? [{ label: "Due date", value: longDate(invoice.due_date) }] : []),
    ],
    billedToLabel: "Billed to",
    billedTo: partyFromCustomer(invoice.customer),
    lines: invoice.items.map(lineFromItem),
    totals: {
      subtotal: money(invoice.subtotal),
      discount: invoice.discount_amount > 0 ? money(invoice.discount_amount) : undefined,
      ...(hasPayment ? { total: money(invoice.amount), paid: money(invoice.advance_amount) } : {}),
      finalLabel: hasPayment ? "Amount due" : "Total due",
      finalAmount: money(hasPayment ? invoice.balance_due : invoice.amount),
    },
    terms: settings.invoice_terms || undefined,
    payments: paymentsOf(invoice),
    notice: invoice.status === "cancelled" ? "CANCELLED" : undefined,
  };
}

export interface QuotationLike {
  quotation_number: string;
  created_at: string;
  valid_until: string | null;
  project_type: string | null;
  subtotal: number;
  discount_amount: number;
  amount: number;
  customer: CustomerLike | null;
  items: ItemLike[];
}

export function quotationToDocument(
  quotation: QuotationLike,
  settings: DocumentSettings,
  statusLabel?: string,
): DocumentData {
  return {
    label: "QUOTATION",
    number: quotation.quotation_number,
    dates: [
      { label: "Quotation date", value: longDate(quotation.created_at) },
      ...(quotation.valid_until ? [{ label: "Valid until", value: longDate(quotation.valid_until) }] : []),
      ...(quotation.project_type ? [{ label: "Job type", value: quotation.project_type }] : []),
    ],
    billedToLabel: "Quoted to",
    billedTo: partyFromCustomer(quotation.customer),
    lines: quotation.items.map(lineFromItem),
    totals: {
      subtotal: money(quotation.subtotal),
      discount: quotation.discount_amount > 0 ? money(quotation.discount_amount) : undefined,
      finalLabel: "Estimated total",
      finalAmount: money(quotation.amount),
    },
    terms: settings.quotation_terms || undefined,
    payments: [],
    notice: statusLabel,
  };
}

// Fixed sample content for the System Setup live preview - same renderer,
// made-up data, so the admin sees exactly how their choices will look.
export function sampleInvoiceDocument(settings: DocumentSettings): DocumentData {
  const today = new Date().toISOString();
  return invoiceToDocument(
    {
      id: 0,
      project_id: 0,
      invoice_number: "INV-2026-00001",
      subtotal: 4300,
      discount_amount: 0,
      amount: 4300,
      status: "pending",
      created_at: today,
      due_date: null,
      advance_amount: 2000,
      payment_method: "UPI",
      payment_reference: null,
      balance_due: 2300,
      project: { id: 0, project_type: "Flex", description: null, start_date: null, delivery_date: today },
      customer: {
        first_name: "Sample",
        last_name: "Customer",
        contact_number: "+91 98765 43210",
        email: "customer@example.com",
        company_name: "Sample Traders",
        company_address: "12 Market Road, Nagercoil",
      },
      items: [
        { id: 1, description: "Shop front flex", width: 10, height: 30, unit: "ft", sq_ft: 300, rate: 10, pieces: 1, total: 3000, is_manual_total: false },
        { id: 2, description: "Installation", width: 0, height: 0, unit: "ft", sq_ft: 0, rate: 650, pieces: 2, total: 1300, is_manual_total: false, has_dimensions: false },
      ],
      payments: [
        { id: 1, amount: 2000, payment_method: "UPI", payment_reference: "TXN123456", paid_at: today, recorded_by: null },
      ],
    },
    settings,
  );
}
