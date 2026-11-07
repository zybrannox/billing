// The periods a statement can cover, in the shop's own time, from a given moment.
export type StatementPeriod = "this_month" | "last_month" | "last_3_months" | "this_year" | "all";

export const STATEMENT_PERIODS: { value: StatementPeriod; label: string }[] = [
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "last_3_months", label: "Last 3 months" },
  { value: "this_year", label: "This year" },
  { value: "all", label: "All time" },
];

// From the start of the first day up to, but not including, the start of `to`.
export function periodRange(period: StatementPeriod, now: Date): { from?: Date; to?: Date } {
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (period) {
    case "this_month":
      return { from: new Date(y, m, 1), to: new Date(y, m + 1, 1) };
    case "last_month":
      return { from: new Date(y, m - 1, 1), to: new Date(y, m, 1) };
    case "last_3_months":
      return { from: new Date(y, m - 2, 1), to: new Date(y, m + 1, 1) };
    case "this_year":
      return { from: new Date(y, 0, 1), to: new Date(y + 1, 0, 1) };
    case "all":
      return {};
  }
}

const day = (date: Date) => date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

// How the period reads on the statement itself.
export function periodLabel(period: StatementPeriod, now: Date): string {
  const { from, to } = periodRange(period, now);
  if (!from || !to) return "All bills to date";
  const lastDay = new Date(to.getFullYear(), to.getMonth(), to.getDate() - 1);
  return `${day(from)} – ${day(lastDay)}`;
}
