// How a payment is split across a customer's unpaid invoices, kept in paise
// (whole numbers) so ₹0.10 + ₹0.20 never turns into ₹0.30000000000000004.

export interface Payable {
  id: number;
  balance_due: number;
}

const toPaise = (rupees: number) => Math.round(rupees * 100);
const toRupees = (paise: number) => paise / 100;

/** Fills invoices oldest first (the order given) until the money runs out. */
export function autoAllocate(amount: number, invoices: Payable[]): Record<number, number> {
  let left = Math.max(0, toPaise(amount) || 0);
  const out: Record<number, number> = {};
  for (const invoice of invoices) {
    if (left <= 0) break;
    const share = Math.min(left, toPaise(invoice.balance_due));
    if (share > 0) {
      out[invoice.id] = toRupees(share);
      left -= share;
    }
  }
  return out;
}

/** A typed-in share: blank means nothing, anything unreadable is NaN. */
export function parseShare(text: string | undefined): number {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return 0;
  return Number(trimmed);
}

export interface SplitCheck {
  applied: number;
  left: number;
  /** Per invoice, why its share can't be saved. */
  invoiceErrors: Record<number, string>;
  /** Why the whole split can't be saved. */
  error: string;
}

export function checkSplit(amount: number, invoices: Payable[], shares: Record<number, string>): SplitCheck {
  const invoiceErrors: Record<number, string> = {};
  let applied = 0;
  for (const invoice of invoices) {
    const share = parseShare(shares[invoice.id]);
    if (Number.isNaN(share) || share < 0) invoiceErrors[invoice.id] = "Enter an amount";
    else if (toPaise(share) > toPaise(invoice.balance_due)) invoiceErrors[invoice.id] = "More than the balance";
    else applied += toPaise(share);
  }
  const total = toPaise(amount) || 0;
  const left = total - applied;
  let error = "";
  if (Object.keys(invoiceErrors).length) error = "Fix the highlighted amounts.";
  else if (left < 0) error = "The invoices add up to more than the payment.";
  return { applied: toRupees(applied), left: toRupees(left), invoiceErrors, error };
}

/** What gets sent: only invoices with a share above zero. */
export function toAllocations(invoices: Payable[], shares: Record<number, string>) {
  return invoices
    .map((invoice) => ({ invoice_id: invoice.id, amount: toRupees(toPaise(parseShare(shares[invoice.id]))) }))
    .filter((a) => a.amount > 0);
}

export const asText = (shares: Record<number, number>): Record<number, string> =>
  Object.fromEntries(Object.entries(shares).map(([id, v]) => [id, String(v)]));
