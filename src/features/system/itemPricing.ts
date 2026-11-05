import { formatRupees } from "../../format/money";

export interface MinChargeTier {
  up_to_sq_ft: number;
  amount: number;
}

// The same rules the server enforces, said in words before saving.
export const tierError = (tiers: { upTo: string; amount: string }[]): string | null => {
  let previous = 0;
  for (const tier of tiers) {
    const upTo = Number(tier.upTo);
    if (tier.upTo.trim() === "" || !(upTo > 0)) return "Each minimum needs a size above 0.";
    if (tier.amount.trim() === "" || !(Number(tier.amount) >= 0)) return "Each minimum needs a charge of 0 or more.";
    if (upTo <= previous) return "List the minimums from smallest size to biggest.";
    previous = upTo;
  }
  return null;
};

// "₹12 per sq ft · Min ₹150 up to 15 sq ft, ₹200 up to 20 sq ft"
export const pricingSummary = (rate: number | null | undefined, tiers: MinChargeTier[] | null | undefined) => {
  const parts = [rate != null ? `${formatRupees(Number(rate))} per sq ft` : "No default rate"];
  if (tiers?.length) {
    parts.push(`Min ${tiers.map((t) => `${formatRupees(t.amount)} up to ${t.up_to_sq_ft} sq ft`).join(", ")}`);
  }
  return parts.join(" · ");
};
