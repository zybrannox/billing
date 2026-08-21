
export const SEMANTIC_COLORS = {
  priority: {
    Normal: "#2563EB",
    High: "#F59E0B",
    Urgent: "#DC2626",
  },
  clientStatus: {
    Confirmed: "#16A34A",
    Correction: "#EA580C",
  },
  projectStatus: {
    Pending: "#64748B",
    "In Progress": "#2563EB",
    Completed: "#16A34A",
    Delayed: "#DC2626",
  },
  printStatus:{
    Pending: "#64748B",
    "In Progress": "#2563EB",
    Completed: "#16A34A",
  },
  status:{
    Active: "#16A34A",
    InActive: "#DC2626",
  }
} as const;

type SemanticCategory =
  | "priority"
  | "clientStatus"
  | "projectStatus"
  | "printStatus"
  | "status";

export const getSemanticColor = (
  category: SemanticCategory,
  value: string
) => {
  // `category` narrows which of SEMANTIC_COLORS' record shapes applies,
  // but `value` is a runtime string the caller doesn't statically know is
  // one of that shape's literal keys - this lookup is deliberately dynamic
  // (with the fallback below covering anything that doesn't match), so the
  // cast documents that instead of quietly widening the whole object to
  // `any`.
  const palette = SEMANTIC_COLORS[category] as Record<string, string>;
  return palette[value] ?? "#64748B"; // fallback gray
};
