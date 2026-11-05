import { formatDateTime } from "../../format/date";

export type ActionSize = "small" | "medium";

// A row action's color: the icon, its soft background and its hover background.
export interface ActionTint {
  color: string;
  bg: string;
  hover: string;
  border?: string;
}

// The usual tint: a solid icon on a faint wash of the same color.
const wash = (color: string, rgb: string): ActionTint => ({
  color,
  bg: `rgba(${rgb}, 0.06)`,
  hover: `rgba(${rgb}, 0.12)`,
});

export const TINTS = {
  sky: wash("var(--sky-600)", "2, 132, 199"),
  indigo: wash("var(--indigo-500)", "99, 102, 241"),
  deepIndigo: wash("var(--indigo-600)", "79, 70, 229"),
  cyan: wash("var(--cyan-600)", "8, 145, 178"),
  blue: wash("var(--blue-600)", "37, 99, 235"),
  emerald: wash("var(--emerald-600)", "5, 150, 105"),
  rose: wash("var(--rose-600)", "225, 29, 72"),
  violet: wash("var(--violet-600)", "124, 58, 237"),
  neutral: wash("var(--slate-500)", "100, 116, 139"),
  document: { color: "var(--slate-600)", bg: "rgba(100, 116, 139, 0.08)", hover: "rgba(100, 116, 139, 0.16)" },
  whatsapp: { color: "var(--brand-whatsapp)", bg: "var(--brand-whatsapp-soft)", hover: "var(--brand-whatsapp-soft-hover)" },
} satisfies Record<string, ActionTint>;

export const iconFontSize = (size: ActionSize) => (size === "small" ? "1.125rem" : "1.25rem");

export interface MilestoneMeta {
  at: string;
  by: string;
}

// `name` is the milestone in a sentence, e.g. "Design completed".
export const milestoneTitle = (name: string, meta: MilestoneMeta) =>
  `${name} on ${formatDateTime(meta.at)} by ${meta.by}`;

export const DONE_TINT: ActionTint = {
  color: "var(--emerald-600)",
  bg: "rgba(16, 185, 129, 0.08)",
  hover: "rgba(16, 185, 129, 0.15)",
  border: "rgba(16, 185, 129, 0.2)",
};

export const WAITING_TINT: ActionTint = {
  color: "var(--slate-400)",
  bg: "rgba(148, 163, 184, 0.08)",
  hover: "rgba(148, 163, 184, 0.15)",
  border: "rgba(148, 163, 184, 0.18)",
};

const actionableTint = (color: string, rgb: string): ActionTint => ({
  color,
  bg: `rgba(${rgb}, 0.08)`,
  hover: `rgba(${rgb}, 0.15)`,
  border: `rgba(${rgb}, 0.2)`,
});

export const MILESTONE_TINTS = {
  design: actionableTint("var(--indigo-600)", "79, 70, 229"),
  print: actionableTint("var(--orange-600)", "234, 88, 12"),
  deliver: actionableTint("var(--sky-600)", "2, 132, 199"),
};
