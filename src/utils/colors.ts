
export const SEMANTIC_COLORS = {
  priority: {
    Low: "#6B7280",
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
} as const;

type SemanticCategory =
  | "priority"
  | "clientStatus"
  | "projectStatus"
  | "printStatus";

export const getSemanticColor = (
  category: SemanticCategory,
  value: string
) => {
  return SEMANTIC_COLORS[category]?.[value] ?? "#64748B"; // fallback gray
};
