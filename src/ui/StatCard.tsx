import { Box, Paper, Typography } from "@mui/material";

// Stat Card - a soft-shadow card with a colored top edge instead of the
// old bordered box + icon-in-a-square treatment. Lighter and more
// "floating" so it reads well sitting just under the dark hero band
// (see the Dashboard's stat row below), and the accent color is legible
// at a glance from the top edge alone, before you even reach the icon.
export function StatCard({
  icon,
  label,
  value,
  color,
  bg,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  bg: string;
  sub?: string;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: "16px",
        borderTop: `3px solid ${color}`,
        bgcolor: "var(--white)",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 24px -16px rgba(15, 23, 42, 0.18)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: 128,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="body2" sx={{ color: "var(--slate-500)", fontWeight: 600, fontSize: "var(--fs-sm)" }}>
          {label}
        </Typography>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: "10px",
            bgcolor: bg,
            color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: "var(--fs-6xl)",
            fontWeight: 800,
            color: "var(--slate-900)",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {value}
        </Typography>
        <Typography variant="caption" sx={{ color: "var(--slate-400)", mt: 1, display: "block" }}>
          {sub ?? "Updated just now"}
        </Typography>
      </Box>
    </Paper>
  );
}
