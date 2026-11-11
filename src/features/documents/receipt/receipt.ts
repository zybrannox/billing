// A bill for a thermal receipt printer (58 mm or 80 mm roll), laid out as
// fixed-width lines of text. The same lines are drawn by the browser (print
// through the printer's driver, see printReceipt.ts) and sent as printer
// commands over Bluetooth (escpos.ts), so both print the same thing.
import { formatDimension, type InvoiceDetail } from "../../billing/invoiceSheetUtils";
import type { DocumentSettings } from "../documentSettings";
import { formatAmount } from "../../../format/money";

export type PaperWidth = 58 | 80;

/** Characters per line in the printer's normal font: 384 and 576 dots wide. */
export const COLUMNS: Record<PaperWidth, number> = { 58: 32, 80: 48 };

export interface ReceiptLine {
  text: string;
  align?: "left" | "center";
  bold?: boolean;
  /** Double width and height: half as many characters fit. */
  big?: boolean;
}

/** Splits text into lines of at most `width` characters, breaking at spaces where it can. */
export function wrap(text: string, width: number): string[] {
  const out: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      let rest = word;
      // A word longer than a whole line is cut, not lost.
      while (rest.length > width) {
        if (line) {
          out.push(line);
          line = "";
        }
        out.push(rest.slice(0, width));
        rest = rest.slice(width);
      }
      if (!rest) continue;
      if (!line) line = rest;
      else if (line.length + 1 + rest.length <= width) line += ` ${rest}`;
      else {
        out.push(line);
        line = rest;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

/** Text on the left, amount on the right; the left side is shortened if both don't fit. */
export function columns(left: string, right: string, width: number): string {
  const room = width - right.length - 1;
  const l = left.length > room ? `${left.slice(0, Math.max(0, room - 1))}.` : left;
  return `${l}${" ".repeat(Math.max(1, width - l.length - right.length))}${right}`;
}

const amount = (value: number) => formatAmount(value);

const dateTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${date} ${time}`;
};

/** The receipt for an invoice, as lines that fit `cols` characters. */
export function invoiceReceipt(invoice: InvoiceDetail, settings: DocumentSettings, cols: number): ReceiptLine[] {
  const rule: ReceiptLine = { text: "-".repeat(cols) };
  const center = (text: string, extra: Partial<ReceiptLine> = {}) =>
    wrap(text, extra.big ? Math.floor(cols / 2) : cols).map((t) => ({ text: t, align: "center" as const, ...extra }));
  const left = (text: string, extra: Partial<ReceiptLine> = {}) => wrap(text, cols).map((t) => ({ text: t, ...extra }));
  const row = (label: string, value: string, extra: Partial<ReceiptLine> = {}) => ({ text: columns(label, value, cols), ...extra });

  const lines: ReceiptLine[] = [];

  // Shop
  lines.push(...center(settings.business_name || "Invoice", { bold: true, big: true }));
  if (settings.address) lines.push(...center(settings.address));
  if (settings.phone) lines.push(...center(`Ph: ${settings.phone}`));
  lines.push(rule);

  if (invoice.status === "cancelled") lines.push(...center("*** CANCELLED ***", { bold: true }), rule);

  // Bill
  lines.push(...left(`Bill no: ${invoice.invoice_number}`, { bold: true }));
  lines.push(...left(`Date: ${dateTime(invoice.created_at)}`));
  const customer = invoice.customer;
  const name = customer ? `${customer.first_name} ${customer.last_name}`.trim() : invoice.customer_name;
  if (name) lines.push(...left(`Customer: ${name}`));
  if (customer?.contact_number) lines.push(...left(`Phone: ${customer.contact_number}`));
  lines.push(rule, row("Item", "Amount", { bold: true }), rule);

  // Items: the name on its own line(s), then "qty x rate  (size)" and the amount.
  invoice.items.forEach((item, index) => {
    const number = `${index + 1}. `;
    wrap(item.description || "Item", cols - number.length).forEach((text, i) =>
      lines.push({ text: `${i ? " ".repeat(number.length) : number}${text}` }),
    );
    const measured = item.has_dimensions !== false;
    const size = measured ? `${formatDimension(item.width, item.unit)}x${formatDimension(item.height, item.unit)}` : "";
    const how = item.is_manual_total ? `Qty ${item.pieces}` : `${item.pieces} x ${amount(item.rate)}${measured ? "/sqft" : ""}`;
    lines.push(row(`   ${how}${size ? ` ${size}` : ""}`, amount(item.total)));
  });
  lines.push(rule);

  // Totals
  const paid = invoice.status === "paid" ? invoice.amount : invoice.advance_amount;
  if (invoice.discount_amount > 0) {
    lines.push(row("Subtotal", amount(invoice.subtotal)));
    lines.push(row("Discount", `-${amount(invoice.discount_amount)}`));
  }
  lines.push(row("TOTAL", amount(invoice.amount), { bold: true }));
  if (paid > 0) {
    lines.push(row("Paid", amount(paid)));
    lines.push(row(invoice.balance_due > 0 ? "BALANCE DUE" : "Balance", amount(invoice.balance_due), { bold: invoice.balance_due > 0 }));
  }
  const method = [...(invoice.payments ?? [])].reverse().find((p) => p.amount > 0)?.payment_method ?? invoice.payment_method;
  if (paid > 0 && method) lines.push(...left(`Paid by: ${method}`));
  lines.push(rule);

  if (settings.footer_message) lines.push(...center(settings.footer_message));
  return lines;
}
