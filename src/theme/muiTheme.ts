import { createTheme, type Theme } from "@mui/material/styles";
import { palette, semantic } from "./tokens";

export type ThemeMode = "light" | "dark";

// The one MUI theme, built from the design tokens - so a MUI component that
// isn't styled explicitly (a Switch, a CircularProgress, a Tab, a Dialog) picks
// up the same brand colours, fonts and text colours as everything else, and
// changing a token changes it everywhere.
//
// Colours are plain hex (not var(--...)) on purpose: MUI derives hover/alpha
// shades from them with colour maths, which only works on real colour values.
// `mode` switches the semantic set; dark mode isn't exposed in the UI yet (see
// tokens.ts), but this is the only place that has to know about it.
export function createAppTheme(mode: ThemeMode = "light"): Theme {
  const s = semantic[mode];

  return createTheme({
    palette: {
      mode,
      primary: { main: s.primary, dark: s.primaryHover, light: palette.blue[400], contrastText: s.onPrimary },
      success: { main: s.success },
      warning: { main: s.warning },
      error: { main: s.danger },
      info: { main: s.info },
      text: { primary: s.text, secondary: s.textMuted },
      background: { default: s.background, paper: s.surface },
      divider: s.border,
    },
    typography: {
      // CSS variables from the generated tokens CSS - the same fonts as the
      // plain HTML (see index.css), and the headings get their own face.
      fontFamily: "var(--font-body)",
      h1: { fontFamily: "var(--font-heading)" },
      h2: { fontFamily: "var(--font-heading)" },
      h3: { fontFamily: "var(--font-heading)" },
      h4: { fontFamily: "var(--font-heading)" },
      h5: { fontFamily: "var(--font-heading)" },
      h6: { fontFamily: "var(--font-heading)" },
    },
  });
}
