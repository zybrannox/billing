// Design tokens - the ONE place colours, type sizes, radii and shadows are
// defined. Everything else is derived from this file:
//
//   - CSS variables (--blue-600, --text-muted, --fs-md, ...) and Tailwind's
//     colour theme are generated from it (see generateCss.ts and the
//     design-tokens plugin in vite.config.ts) - no hand-written token CSS;
//   - the MUI theme (muiTheme.ts) reads it;
//   - the printed documents (src/features/documents) take their accent palette and
//     neutrals from it.
//
// Rules for what lives here:
//   * Colours are plain hex. html2canvas (PDF export / WhatsApp share) can't
//     parse oklch() or color-mix(), so nothing exported to a document may use
//     them.
//   * Components reference tokens (`var(--blue-600)`, `var(--text-muted)`),
//     never raw hex - the ESLint config enforces this outside src/theme.

export type Scale = Record<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900, string>;

// Complete scales (Tailwind's classic palette) - every step exists, so a
// var(--emerald-300) can never silently resolve to nothing.
export const palette = {
  slate: { 50: "#f8fafc", 100: "#f1f5f9", 200: "#e2e8f0", 300: "#cbd5e1", 400: "#94a3b8", 500: "#64748b", 600: "#475569", 700: "#334155", 800: "#1e293b", 900: "#0f172a" },
  gray: { 50: "#f9fafb", 100: "#f3f4f6", 200: "#e5e7eb", 300: "#d1d5db", 400: "#9ca3af", 500: "#6b7280", 600: "#4b5563", 700: "#374151", 800: "#1f2937", 900: "#111827" },
  blue: { 50: "#eff6ff", 100: "#dbeafe", 200: "#bfdbfe", 300: "#93c5fd", 400: "#60a5fa", 500: "#3b82f6", 600: "#2563eb", 700: "#1d4ed8", 800: "#1e40af", 900: "#1e3a8a" },
  red: { 50: "#fef2f2", 100: "#fee2e2", 200: "#fecaca", 300: "#fca5a5", 400: "#f87171", 500: "#ef4444", 600: "#dc2626", 700: "#b91c1c", 800: "#991b1b", 900: "#7f1d1d" },
  green: { 50: "#f0fdf4", 100: "#dcfce7", 200: "#bbf7d0", 300: "#86efac", 400: "#4ade80", 500: "#22c55e", 600: "#16a34a", 700: "#15803d", 800: "#166534", 900: "#14532d" },
  emerald: { 50: "#ecfdf5", 100: "#d1fae5", 200: "#a7f3d0", 300: "#6ee7b7", 400: "#34d399", 500: "#10b981", 600: "#059669", 700: "#047857", 800: "#065f46", 900: "#064e3b" },
  amber: { 50: "#fffbeb", 100: "#fef3c7", 200: "#fde68a", 300: "#fcd34d", 400: "#fbbf24", 500: "#f59e0b", 600: "#d97706", 700: "#b45309", 800: "#92400e", 900: "#78350f" },
  orange: { 50: "#fff7ed", 100: "#ffedd5", 200: "#fed7aa", 300: "#fdba74", 400: "#fb923c", 500: "#f97316", 600: "#ea580c", 700: "#c2410c", 800: "#9a3412", 900: "#7c2d12" },
  yellow: { 50: "#fefce8", 100: "#fef9c3", 200: "#fef08a", 300: "#fde047", 400: "#facc15", 500: "#eab308", 600: "#ca8a04", 700: "#a16207", 800: "#854d0e", 900: "#713f12" },
  indigo: { 50: "#eef2ff", 100: "#e0e7ff", 200: "#c7d2fe", 300: "#a5b4fc", 400: "#818cf8", 500: "#6366f1", 600: "#4f46e5", 700: "#4338ca", 800: "#3730a3", 900: "#312e81" },
  violet: { 50: "#f5f3ff", 100: "#ede9fe", 200: "#ddd6fe", 300: "#c4b5fd", 400: "#a78bfa", 500: "#8b5cf6", 600: "#7c3aed", 700: "#6d28d9", 800: "#5b21b6", 900: "#4c1d95" },
  cyan: { 50: "#ecfeff", 100: "#cffafe", 200: "#a5f3fc", 300: "#67e8f9", 400: "#22d3ee", 500: "#06b6d4", 600: "#0891b2", 700: "#0e7490", 800: "#155e75", 900: "#164e63" },
  sky: { 50: "#f0f9ff", 100: "#e0f2fe", 200: "#bae6fd", 300: "#7dd3fc", 400: "#38bdf8", 500: "#0ea5e9", 600: "#0284c7", 700: "#0369a1", 800: "#075985", 900: "#0c4a6e" },
  rose: { 50: "#fff1f2", 100: "#ffe4e6", 200: "#fecdd3", 300: "#fda4af", 400: "#fb7185", 500: "#f43f5e", 600: "#e11d48", 700: "#be123c", 800: "#9f1239", 900: "#881337" },
  teal: { 50: "#f0fdfa", 100: "#ccfbf1", 200: "#99f6e4", 300: "#5eead4", 400: "#2dd4bf", 500: "#14b8a6", 600: "#0d9488", 700: "#0f766e", 800: "#115e59", 900: "#134e4a" },
} as const satisfies Record<string, Scale>;

export type PaletteFamily = keyof typeof palette;

export const basics = { white: "#ffffff", black: "#000000" } as const;

// Third-party brand colours that aren't part of our palette.
export const brand = {
  whatsapp: "#25D366",
  whatsappSoft: "rgba(37, 211, 102, 0.08)",
  whatsappSoftHover: "rgba(37, 211, 102, 0.16)",
} as const;

// ---------------------------------------------------------------------------
// Semantic tokens: what a colour is *for*, not what hue it is. Components
// should prefer these (var(--text-muted), var(--surface)) over palette steps,
// because only these change between light and dark.
// ---------------------------------------------------------------------------
export interface SemanticTokens {
  background: string;
  foreground: string;
  surface: string;
  surfaceMuted: string;
  surfaceSunken: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  primary: string;
  primaryHover: string;
  primarySoft: string;
  onPrimary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
}

export const semantic: { light: SemanticTokens; dark: SemanticTokens } = {
  light: {
    background: basics.white,
    foreground: palette.slate[900],
    surface: basics.white,
    surfaceMuted: palette.slate[50],
    surfaceSunken: palette.slate[100],
    border: palette.slate[200],
    borderStrong: palette.slate[300],
    text: palette.slate[900],
    textMuted: palette.slate[500],
    textSubtle: palette.slate[400],
    primary: palette.blue[600],
    primaryHover: palette.blue[700],
    primarySoft: palette.blue[50],
    onPrimary: basics.white,
    success: palette.green[600],
    warning: palette.amber[600],
    danger: palette.red[600],
    info: palette.sky[600],
  },
  // Ready for a dark mode (set data-theme="dark" on <html>; the MUI theme
  // takes a `mode`). Not switched on anywhere yet - most screens still use
  // palette steps directly, which is what the semantic tokens above are for
  // migrating to.
  dark: {
    background: palette.slate[900],
    foreground: palette.slate[100],
    surface: palette.slate[800],
    surfaceMuted: palette.slate[900],
    surfaceSunken: "#0b1220",
    border: palette.slate[700],
    borderStrong: palette.slate[600],
    text: palette.slate[100],
    textMuted: palette.slate[400],
    textSubtle: palette.slate[500],
    primary: palette.blue[500],
    primaryHover: palette.blue[400],
    primarySoft: "#172554",
    onPrimary: basics.white,
    success: palette.green[500],
    warning: palette.amber[500],
    danger: palette.red[500],
    info: palette.sky[500],
  },
};

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------
export const fontFamily = {
  body: '"Inter", system-ui, "Segoe UI", sans-serif',
  heading: '"Manrope", "Inter", system-ui, "Segoe UI", sans-serif',
} as const;

// The size scale. Use these through `var(--fs-<name>)` in sx/CSS; the lint
// config bans ad-hoc rem/px font sizes outside the printed documents.
export const fontSize = {
  "2xs": "0.7rem",
  xs: "0.75rem",
  sm: "0.8rem",
  md: "0.85rem",
  lg: "0.9rem",
  xl: "0.95rem",
  "2xl": "1.05rem",
  "3xl": "1.125rem",
  "4xl": "1.2rem",
  "5xl": "1.35rem",
  "6xl": "1.5rem",
} as const;

export type FontSizeName = keyof typeof fontSize;

// ---------------------------------------------------------------------------
// Shape and elevation
// ---------------------------------------------------------------------------
export const radius = {
  sm: "0.25rem",
  md: "0.375rem",
  lg: "0.5rem",
  xl: "0.75rem",
  "2xl": "1rem",
} as const;

export const shadow = {
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
  lg: "0 10px 25px -5px rgba(15, 23, 42, 0.05)",
  // Focus ring used by every text input.
  ring: "0 0 0 3px rgba(59, 130, 246, 0.12)",
} as const;

// ---------------------------------------------------------------------------
// Legacy names kept so existing var(--...) references keep working.
// ---------------------------------------------------------------------------
export const legacy = {
  "--admin-body-bg": "oklch(37.9% 0.146 265.522)",
  "--admin-gray": palette.slate[500],
  "--blue-gradient": `linear-gradient(135deg, ${palette.blue[600]} 0%, ${palette.blue[900]} 100%)`,
  "--font-noto-sans": fontFamily.body,
} as const;

// ---------------------------------------------------------------------------
// Printed documents (invoices, quotations) - see src/features/documents. These feed
// html2canvas, so plain hex only.
// ---------------------------------------------------------------------------
export const documentTokens = {
  // The admin picks one of these in System Setup > Invoice & Quotation Design.
  accents: {
    indigo: "#2b2d8f", // the Zybrannox brand navy
    emerald: palette.emerald[700],
    teal: palette.teal[700],
    crimson: palette.red[700],
    amber: palette.amber[700],
    violet: palette.violet[700],
    slate: palette.slate[700],
    terracotta: "#c1512f",
  },
  neutral: {
    ink: "#1f2230",
    muted: "#6b7280",
    label: "#6b7185",
    hairline: "#e3e5ef",
  },
  // The Minimal template's warm greys, also used by the in-app invoice forms.
  warm: {
    ink: "#1b1a17",
    inkMuted: "#6f6a5f",
    label: "#8f8a7d",
    hairline: "#e8e5de",
    accent: "#c1512f",
  },
  compactHeaderBg: "#f1f3f7",
  paper: basics.white,
} as const;

export const tokens = {
  palette,
  basics,
  brand,
  semantic,
  fontFamily,
  fontSize,
  radius,
  shadow,
  legacy,
  documentTokens,
};
