import { Box, Typography } from "@mui/material";
import type { ReactNode } from "react";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import ContactLinks from "./ContactLinks";
import InitialsAvatar from "./InitialsAvatar";
import { surfaceSx } from "./surface";

export interface ProfileMetric {
  label: string;
  value: string;
  sub?: string;
  // For a number that needs attention, like money still owed.
  valueColor?: string;
}

// "Customers › Asha Rao" above a profile.
export function ProfileBreadcrumb({
  parentLabel,
  onParentClick,
  current,
}: {
  parentLabel: string;
  onParentClick: () => void;
  current: string;
}) {
  return (
    <Box component="nav" aria-label="Breadcrumb" sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1.5, fontSize: "var(--fs-sm)", minWidth: 0 }}>
      <Box
        component="button"
        type="button"
        onClick={onParentClick}
        sx={{
          p: 0,
          border: "none",
          background: "none",
          cursor: "pointer",
          font: "inherit",
          fontWeight: 500,
          color: "var(--slate-500)",
          "&:hover": { color: "var(--blue-700)" },
        }}
      >
        {parentLabel}
      </Box>
      <ChevronRightRoundedIcon sx={{ fontSize: 16, color: "var(--slate-400)" }} />
      <Box component="span" sx={{ fontWeight: 500, color: "var(--slate-700)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {current}
      </Box>
    </Box>
  );
}

// Who this person is, how to reach them, and their numbers: the top of any
// person's profile page.
export default function ProfileHeader({
  name,
  badges,
  phone,
  email,
  actions,
  metrics,
}: {
  name: string;
  badges?: ReactNode;
  phone?: string | null;
  email?: string | null;
  actions?: ReactNode;
  metrics: ProfileMetric[];
}) {
  return (
    <Box
      component="section"
      sx={{
        ...surfaceSx,
        overflow: "hidden",
        mb: 2,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 2, p: 2, minWidth: 0 }}>
        <InitialsAvatar name={name} size={52} />
        <Box sx={{ minWidth: 0, flex: "1 1 240px" }}>
          <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
            <Typography
              component="h1"
              sx={{ fontSize: "var(--fs-5xl)", fontWeight: 700, color: "var(--slate-900)", lineHeight: 1.2, overflowWrap: "anywhere" }}
            >
              {name}
            </Typography>
            {badges}
          </Box>
          <ContactLinks phone={phone} email={email} />
        </Box>
        {actions && <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>{actions}</Box>}
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: `repeat(${metrics.length}, minmax(0, 1fr))` },
          borderTop: "1px solid var(--slate-100)",
          bgcolor: "var(--slate-50)",
        }}
      >
        {metrics.map((metric) => (
          <Box key={metric.label} sx={{ px: 2, py: 1.5, minWidth: 0 }}>
            <Typography sx={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--slate-500)" }}>{metric.label}</Typography>
            <Box sx={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", columnGap: 0.75, mt: 0.25 }}>
              <Typography sx={{ fontSize: "var(--fs-5xl)", fontWeight: 700, color: metric.valueColor ?? "var(--slate-900)", lineHeight: 1.2 }}>
                {metric.value}
              </Typography>
              {metric.sub && <Typography sx={{ fontSize: "var(--fs-xs)", color: "var(--slate-500)" }}>{metric.sub}</Typography>}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
