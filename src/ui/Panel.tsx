import { Box, Typography } from "@mui/material";
import type { ReactNode } from "react";

// A plain titled surface (no icon) for forms and tables - the same hairline
// border and radius as SectionCard so the two sit together. `flush` removes
// the body padding for content that brings its own (a data table).
export default function Panel({
  title,
  description,
  action,
  flush = false,
  children,
  sx,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  flush?: boolean;
  children: ReactNode;
  sx?: object;
}) {
  return (
    <Box
      component="section"
      sx={{
        bgcolor: "var(--white)",
        border: "1px solid var(--slate-200)",
        borderRadius: "12px",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
        overflow: "hidden",
        minWidth: 0,
        ...sx,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
          px: 2,
          py: 1.25,
          borderBottom: flush ? "1px solid var(--slate-100)" : "none",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h2" sx={{ fontWeight: 700, color: "var(--slate-900)", fontSize: "var(--fs-md)" }}>
            {title}
          </Typography>
          {description && (
            <Typography sx={{ color: "var(--slate-500)", fontSize: "var(--fs-xs)" }}>{description}</Typography>
          )}
        </Box>
        {action}
      </Box>
      <Box sx={flush ? {} : { px: 2, pb: 1.5 }}>{children}</Box>
    </Box>
  );
}
