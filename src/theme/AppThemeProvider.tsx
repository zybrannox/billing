import { useMemo, type ReactNode } from "react";
import { ThemeProvider } from "@mui/material/styles";
import { createAppTheme, type ThemeMode } from "./muiTheme";

// Mounted once, at the very top of the app (main.tsx), so every MUI component
// - including the global dialogs that live outside any layout, and the client
// portal - shares the same theme. (It used to be created separately inside
// the admin and employee layouts, leaving the dialogs and the portal on MUI's
// own default theme and font.)
export default function AppThemeProvider({ mode = "light", children }: { mode?: ThemeMode; children: ReactNode }) {
  const theme = useMemo(() => createAppTheme(mode), [mode]);
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
