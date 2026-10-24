import { Box, Paper, Typography } from "@mui/material";

// The one card shell used for every titled section (dashboard, profiles,
// System Setup): a quiet white surface with a hairline border, a small tinted
// icon and a single-line header. `height: 100%` lets cards in the same grid
// row line up; the body grows to fill whatever height the row gives it.
export function SectionCard({
  icon,
  iconColor,
  iconBg,
  title,
  action,
  children,
  sx,
}: {
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  sx?: object;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: "12px",
        border: "1px solid var(--slate-200)",
        bgcolor: "var(--white)",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        ...sx,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5, flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: "8px",
              bgcolor: iconBg,
              color: iconColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              "& svg": { fontSize: 18 },
            }}
          >
            {icon}
          </Box>
          <Typography noWrap sx={{ fontWeight: 700, color: "var(--slate-900)", fontSize: "var(--fs-md)" }}>
            {title}
          </Typography>
        </Box>
        {action}
      </Box>
      <Box sx={{ flex: 1, minHeight: 0 }}>{children}</Box>
    </Paper>
  );
}
