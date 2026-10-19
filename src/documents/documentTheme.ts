// Colour themes for printed documents. Only the accent is a choice - every
// other tone (ink, muted text, hairlines) is shared, so a document stays
// legible and consistent whichever accent is picked, and adding a preset is
// one line here (plus its name in the backend's Theme literal).

export interface ThemePreset {
  key: string;
  label: string;
  color: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  { key: "indigo", label: "Indigo", color: "#2b2d8f" },
  { key: "emerald", label: "Emerald", color: "#047857" },
  { key: "teal", label: "Teal", color: "#0f766e" },
  { key: "crimson", label: "Crimson", color: "#b91c1c" },
  { key: "amber", label: "Amber", color: "#b45309" },
  { key: "violet", label: "Violet", color: "#6d28d9" },
  { key: "slate", label: "Slate", color: "#334155" },
  { key: "terracotta", label: "Terracotta", color: "#c1512f" },
];

export const CUSTOM_THEME_KEY = "custom";

export interface DocumentTheme {
  primary: string;
  // Text/icons drawn on top of `primary` (the table header, the due bar).
  onPrimary: string;
  ink: string;
  muted: string;
  label: string;
  hairline: string;
}

// WCAG relative luminance - decides whether white or near-black text reads
// better on a chosen accent, so a pale custom colour never gets white-on-
// white headers.
const luminance = (hex: string) => {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
};

// `color` at the given opacity - for tinted backgrounds that stay in the
// accent's family whatever the accent is.
export const tint = (hex: string, alpha: number) =>
  `${hex}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;

export const isHexColor = (value: string | null | undefined): value is string =>
  !!value && /^#[0-9a-fA-F]{6}$/.test(value);

export function resolveDocumentTheme(settings: {
  theme: string;
  custom_color: string | null;
}): DocumentTheme {
  const preset = THEME_PRESETS.find((p) => p.key === settings.theme);
  const primary =
    settings.theme === CUSTOM_THEME_KEY && isHexColor(settings.custom_color)
      ? settings.custom_color
      : (preset ?? THEME_PRESETS[0]).color;

  return {
    primary,
    onPrimary: luminance(primary) > 0.45 ? "#111827" : "#ffffff",
    ink: "#1f2230",
    muted: "#6b7280",
    label: "#6b7185",
    hairline: "#e3e5ef",
  };
}
