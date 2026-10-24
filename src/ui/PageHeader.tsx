import { Box, Typography } from "@mui/material";
import type { ReactNode } from "react";

// Title + one line of context (+ an optional action on the right) for the top
// of a page. Quiet by design: the page's content is the point, not the title.
export default function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 2 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography component="h1" sx={{ fontSize: "var(--fs-5xl)", fontWeight: 700, color: "var(--slate-900)", lineHeight: 1.2 }}>
          {title}
        </Typography>
        {description && (
          <Typography sx={{ mt: 0.25, fontSize: "var(--fs-sm)", color: "var(--slate-500)" }}>{description}</Typography>
        )}
      </Box>
      {action}
    </Box>
  );
}
