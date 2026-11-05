import { Box } from "@mui/material";
import type { ReactNode } from "react";

// The quiet grey page behind a list or profile's white cards. Fills the screen
// below the top bar (which is shorter on a phone) so the grey never stops short.
export default function PageShell({ children }: { children: ReactNode }) {
  return (
    <Box
      component="main"
      sx={{
        p: { xs: 1.5, md: 3 },
        minWidth: 0,
        minHeight: { xs: "calc(100vh - 56px)", sm: "calc(100vh - 64px)" },
        bgcolor: "var(--slate-50)",
      }}
    >
      {children}
    </Box>
  );
}
