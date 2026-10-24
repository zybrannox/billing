import { Box, Typography } from "@mui/material";
import type { ReactNode } from "react";

export type MetricLevel = "ok" | "warning" | "critical";

const DOT: Record<MetricLevel, string> = {
  ok: "var(--emerald-500)",
  warning: "var(--amber-500)",
  critical: "var(--red-500)",
};

// A single number worth seeing at a glance: small caption, big value, a
// coloured status dot and one line of context. Several in a row make a
// dashboard header that can be read in a second.
export default function MetricTile({
  label,
  value,
  caption,
  level = "ok",
  icon,
}: {
  label: string;
  value: ReactNode;
  caption?: string;
  level?: MetricLevel;
  icon?: ReactNode;
}) {
  return (
    <Box
      sx={{
        p: 1.5,
        bgcolor: "var(--white)",
        border: "1px solid var(--slate-200)",
        borderRadius: "12px",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
        minWidth: 0,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
        <Typography sx={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--slate-500)" }}>{label}</Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "var(--slate-400)", "& svg": { fontSize: 16 } }}>
          {icon}
          <Box aria-hidden sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: DOT[level] }} />
        </Box>
      </Box>
      <Typography sx={{ mt: 0.25, fontSize: "var(--fs-4xl)", fontWeight: 700, color: "var(--slate-900)", lineHeight: 1.2 }}>{value}</Typography>
      {caption && <Typography sx={{ fontSize: "var(--fs-2xs)", color: "var(--slate-500)" }}>{caption}</Typography>}
    </Box>
  );
}
