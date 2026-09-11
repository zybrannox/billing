
// Every value here is a CSS variable reference (see src/index.css's :root)
// rather than a hardcoded hex literal, so the palette itself lives in one
// place. This works because semanticChipSx (ui/chipStyles.ts) builds its
// translucent background via color-mix(), not by string-appending a hex
// alpha suffix - that trick only ever worked on a literal 6-digit hex
// string, and `var(--red-600)22` isn't valid CSS.
export const SEMANTIC_COLORS = {
  priority: {
    Normal: "var(--blue-600)",
    High: "var(--amber-500)",
    Urgent: "var(--red-600)",
  },
  clientStatus: {
    Confirmed: "var(--green-600)",
    Correction: "var(--orange-600)",
  },
  projectStatus: {
    Pending: "var(--slate-500)",
    "In Progress": "var(--blue-600)",
    Completed: "var(--green-600)",
    Delayed: "var(--red-600)",
  },
  printStatus:{
    Pending: "var(--slate-500)",
    "In Progress": "var(--blue-600)",
    Completed: "var(--green-600)",
  },
  status:{
    Active: "var(--green-600)",
    InActive: "var(--red-600)",
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
  return palette[value] ?? "var(--slate-500)"; // fallback gray
};
