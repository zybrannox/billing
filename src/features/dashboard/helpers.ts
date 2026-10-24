import { formatShortDate } from "../../format/date";
import { type Granularity } from "./types";

// A flat "Dashboard" title read the same at 8am and 8pm regardless of who
// was looking at it - this is the one place in the app that greets the
// person actually using it, the way the rest of the page already treats
// them as a specific business (real customer names, real revenue), not a
// generic template.
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: "var(--amber-100)", color: "var(--amber-800)", label: "Pending" },
  paid: { bg: "var(--green-100)", color: "var(--green-800)", label: "Paid" },
  cancelled: { bg: "var(--red-100)", color: "var(--red-800)", label: "Cancelled" },
};

export const PROJECT_TYPE_INITIAL = (v: string | null) => (v?.trim() ? v.trim()[0].toUpperCase() : "?");

export const CUSTOMER_INITIALS = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

export const DUE_TONE_STYLES: Record<"overdue" | "today" | "soon" | "credit", { bg: string; color: string; border: string }> = {
  overdue: { bg: "var(--red-50)", color: "var(--red-600)", border: "var(--red-200)" },
  today: { bg: "var(--orange-50)", color: "var(--orange-600)", border: "var(--orange-200)" },
  soon: { bg: "var(--amber-50)", color: "var(--amber-600)", border: "var(--amber-200)" },
  // Purple, not red/amber like the date-based tones - a delivered-on-
  // credit row isn't "running out of time" (the delivery already
  // happened), it's a different kind of risk entirely: money out the
  // door with nothing left to withhold, so it reads as its own category
  // at a glance instead of blending into "overdue".
  credit: { bg: "var(--violet-50)", color: "var(--violet-600)", border: "var(--violet-200)" },
};

// ---------------------------------------------------------------------
// Human-readable urgency label ("3d overdue", "Due today", "Due in 2d")
// computed from the actual delivery date, instead of just the static
// Overdue/Urgent badge - tells the user exactly how much runway is left
// at a glance, without opening the project. A credit-unpaid row bypasses
// all of that: its delivery_date is no longer the relevant deadline once
// the order is already gone, so it always reads as "Delivered on Credit"
// regardless of what that date says.
// ---------------------------------------------------------------------
export function getDueLabel(
  deliveryDate: string | null,
  isOverdue: boolean,
  isCreditUnpaid: boolean,
): { text: string; tone: "overdue" | "today" | "soon" | "credit" } {
  if (isCreditUnpaid) return { text: "Delivered on Credit", tone: "credit" };
  if (!deliveryDate) return isOverdue ? { text: "Overdue", tone: "overdue" } : { text: "Urgent", tone: "soon" };

  const due = new Date(deliveryDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) return { text: `${Math.abs(diffDays)}d overdue`, tone: "overdue" };
  if (diffDays === 0) return { text: "Due today", tone: "today" };
  if (diffDays === 1) return { text: "Due tomorrow", tone: "soon" };
  return { text: `Due in ${diffDays}d`, tone: "soon" };
}

// ---------------------------------------------------------------------
// Date-range readout for the currently selected granularity's window -
// display only, mirrors the backend's own window math (see
// dashboard/repository.py get_revenue_trend) so the label always matches
// what the chart is actually showing.
// ---------------------------------------------------------------------
export function getRangeLabel(granularity: Granularity): string {
  const now = new Date();
  const fmt = formatShortDate;

  if (granularity === "day") {
    const start = new Date(now);
    start.setDate(start.getDate() - 13);
    return `${fmt(start)} - ${fmt(now)}`;
  }
  if (granularity === "week") {
    const dow = (now.getDay() + 6) % 7; // Monday = 0
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() - dow);
    const start = new Date(thisMonday);
    start.setDate(start.getDate() - 7 * 7);
    const end = new Date(thisMonday);
    end.setDate(end.getDate() + 6);
    return `${fmt(start)} - ${fmt(end)}`;
  }
  if (granularity === "year") {
    const start = new Date(now.getFullYear() - 4, 0, 1);
    const end = new Date(now.getFullYear(), 11, 31);
    return `${fmt(start)} - ${fmt(end)}`;
  }
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return `${fmt(start)} - ${fmt(end)}`;
}

// ---------------------------------------------------------------------
// Granularity pill toggle - Day / Week / Month / Year
// ---------------------------------------------------------------------
export const GRANULARITIES: { value: Granularity; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];
