import { toNumber } from "../itemLineUtils";

// Checks a discount and advance against what the lines add up to. The discount
// is checked first since the advance is judged against the discounted total.
export function checkInvoiceAmounts({
  subtotal,
  discountAmount,
  advanceAmount,
  paymentMethod,
}: {
  subtotal: number;
  discountAmount: string;
  advanceAmount: string;
  paymentMethod: string;
}): { discountError?: string; advanceError?: string } {
  const discount = toNumber(discountAmount);
  if (discountAmount.trim() !== "" && discount > subtotal) {
    return { discountError: "Discount can't be more than the invoice subtotal." };
  }
  const advance = toNumber(advanceAmount);
  if (advanceAmount.trim() !== "" && advance > 0) {
    if (!paymentMethod) return { advanceError: "Pick a payment method for the advance received." };
    if (advance > Math.round((subtotal - discount) * 100) / 100) {
      return { advanceError: "Advance received can't be more than the invoice total." };
    }
  }
  return {};
}
