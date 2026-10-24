import { Box, Typography } from "@mui/material";
import type { ReactNode } from "react";

// What a list or panel shows when there is nothing in it yet: a quiet icon, a
// plain sentence saying why, and (optionally) the one action that fills it.
export default function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 0.5, py: 3, px: 2 }}>
      {icon && (
        <Box sx={{ width: 36, height: 36, borderRadius: "10px", display: "grid", placeItems: "center", bgcolor: "var(--slate-100)", color: "var(--slate-400)", mb: 0.5, "& svg": { fontSize: 20 } }}>
          {icon}
        </Box>
      )}
      <Typography sx={{ fontWeight: 600, color: "var(--slate-800)", fontSize: "var(--fs-md)" }}>{title}</Typography>
      {description && <Typography sx={{ color: "var(--slate-500)", fontSize: "var(--fs-sm)", maxWidth: 380 }}>{description}</Typography>}
      {action && <Box sx={{ mt: 1 }}>{action}</Box>}
    </Box>
  );
}
