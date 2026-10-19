import { documentTokens } from "../theme/tokens";
import { resolveDocumentTheme, tint } from "./documentTheme";

// Layout styles for printed documents. A template is *data*, not a copy of
// the renderer: DocumentSheet reads these tokens, so adding a style means
// adding an entry here (and its name to the backend's Template literal) -
// no new component. Colour is a separate choice (documentTheme.ts): every
// template takes the shop's accent and supplies its own neutrals, spacing
// and treatment of the table header, totals and title.

export interface TemplateInfo {
  key: string;
  label: string;
  description: string;
}

export const TEMPLATES: TemplateInfo[] = [
  { key: "classic", label: "Classic", description: "Filled table header and totals bar, colour strip on top." },
  { key: "minimal", label: "Minimal", description: "Quiet and editorial: no fills, thin rules, warm neutrals." },
  { key: "modern", label: "Modern", description: "Tinted header band, banded rows and a soft totals card." },
  { key: "compact", label: "Compact", description: "Dense rows and light grey header for long invoices." },
];

export interface DocumentStyle {
  primary: string;
  onPrimary: string;
  ink: string;
  muted: string;
  label: string;
  hairline: string;
  supportsTopBar: boolean;
  headerBand: string | null;
  logoHeight: number;
  title: { size: string; weight: number; letterSpacing: string; color: string };
  tableHeader: { bg: string; color: string; radius: string; rule: string | null };
  zebra: string | null;
  rowPy: number;
  sectionGap: number;
  totalBar: { bg: string; color: string; radius: string; border: string; size: string; rule: boolean };
  cardRadius: string;
}

type Palette = ReturnType<typeof resolveDocumentTheme>;
type Template = (c: Palette) => Partial<DocumentStyle> &
  Pick<DocumentStyle, "tableHeader" | "totalBar" | "title">;

const NEUTRAL = documentTokens.neutral;
const WARM = documentTokens.warm;

const BUILDERS: Record<string, Template> = {
  classic: (c) => ({
    title: { size: "2.4rem", weight: 800, letterSpacing: "-0.01em", color: c.primary },
    tableHeader: { bg: c.primary, color: c.onPrimary, radius: "10px", rule: null },
    totalBar: { bg: c.primary, color: c.onPrimary, radius: "10px", border: "none", size: "1.1rem", rule: false },
  }),

  minimal: (c) => ({
    ink: WARM.ink,
    muted: WARM.inkMuted,
    label: WARM.label,
    hairline: WARM.hairline,
    supportsTopBar: false,
    logoHeight: 30,
    rowPy: 1.6,
    sectionGap: 5,
    title: { size: "0.95rem", weight: 700, letterSpacing: "0.1em", color: c.primary },
    tableHeader: { bg: "transparent", color: WARM.label, radius: "0", rule: WARM.hairline },
    totalBar: { bg: "transparent", color: WARM.ink, radius: "0", border: "none", size: "1.4rem", rule: true },
    cardRadius: "12px",
  }),

  modern: (c) => ({
    headerBand: tint(c.primary, 0.07),
    title: { size: "2.4rem", weight: 800, letterSpacing: "-0.01em", color: c.primary },
    tableHeader: { bg: c.primary, color: c.onPrimary, radius: "0", rule: null },
    zebra: tint(c.primary, 0.04),
    rowPy: 1.5,
    totalBar: { bg: tint(c.primary, 0.12), color: c.primary, radius: "14px", border: "none", size: "1.25rem", rule: false },
    cardRadius: "18px",
  }),

  compact: (c) => ({
    logoHeight: 40,
    rowPy: 0.65,
    sectionGap: 3,
    title: { size: "1.7rem", weight: 800, letterSpacing: "0", color: c.primary },
    tableHeader: { bg: documentTokens.compactHeaderBg, color: NEUTRAL.ink, radius: "6px", rule: null },
    totalBar: { bg: "transparent", color: NEUTRAL.ink, radius: "8px", border: `1.5px solid ${c.primary}`, size: "1rem", rule: false },
    cardRadius: "10px",
  }),
};

export function resolveDocumentStyle(settings: {
  template: string;
  theme: string;
  custom_color: string | null;
}): DocumentStyle {
  const palette = resolveDocumentTheme(settings);
  const build = BUILDERS[settings.template] ?? BUILDERS.classic;
  const t = build(palette);

  return {
    primary: palette.primary,
    onPrimary: palette.onPrimary,
    ...NEUTRAL,
    supportsTopBar: true,
    headerBand: null,
    logoHeight: 52,
    zebra: null,
    rowPy: 1.25,
    sectionGap: 4,
    cardRadius: "12px",
    ...t,
  };
}
