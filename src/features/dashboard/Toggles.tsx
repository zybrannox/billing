import { Box } from "@mui/material";
import { GRANULARITIES } from "./helpers";
import { type Granularity } from "./types";

export function GranularityToggle({ value, onChange, dark }: { value: Granularity; onChange: (g: Granularity) => void; dark?: boolean }) {
  return (
    <Box sx={{ display: "flex", bgcolor: dark ? "rgba(255,255,255,0.1)" : "var(--slate-100)", borderRadius: 999, p: 0.5, gap: 0.5, flexShrink: 0 }}>
      {GRANULARITIES.map((g) => {
        const active = g.value === value;
        return (
          <Box
            key={g.value}
            component="button"
            onClick={() => onChange(g.value)}
            sx={{
              border: "none",
              px: 2,
              py: 0.75,
              borderRadius: 999,
              cursor: "pointer",
              fontSize: "var(--fs-sm)",
              fontWeight: 700,
              fontFamily: "inherit",
              color: dark
                ? active ? "var(--slate-900)" : "rgba(255,255,255,0.65)"
                : active ? "var(--white)" : "var(--slate-500)",
              bgcolor: active ? (dark ? "var(--white)" : "var(--slate-900)") : "transparent",
              transition: "all 0.15s ease",
              "&:hover": {
                color: active
                  ? (dark ? "var(--slate-900)" : "var(--white)")
                  : (dark ? "var(--white)" : "var(--slate-900)"),
              },
            }}
          >
            {g.label}
          </Box>
        );
      })}
    </Box>
  );
}

// ---------------------------------------------------------------------
// Small pill switcher for the merged Recent Activity card - same visual
// language as GranularityToggle above, so the two toggle controls on this
// page read as one consistent pattern rather than two different widgets.
// An optional badge (e.g. "still-unpaid credit deliveries") rides on top
// of its tab, but only while that tab isn't already the active one - once
// you're looking at it, it stops competing for attention.
// ---------------------------------------------------------------------
export function ActivityTabToggle({
  value,
  onChange,
  badgeCounts,
}: {
  value: "invoices" | "deliveries";
  onChange: (v: "invoices" | "deliveries") => void;
  badgeCounts: Partial<Record<"invoices" | "deliveries", number>>;
}) {
  const tabs: { value: "invoices" | "deliveries"; label: string }[] = [
    { value: "invoices", label: "Invoices" },
    { value: "deliveries", label: "Deliveries" },
  ];
  return (
    <Box sx={{ display: "flex", bgcolor: "var(--slate-100)", borderRadius: 999, p: 0.5, gap: 0.5, flexShrink: 0 }}>
      {tabs.map((t) => {
        const active = t.value === value;
        const badge = badgeCounts[t.value];
        return (
          <Box
            key={t.value}
            component="button"
            onClick={() => onChange(t.value)}
            sx={{
              position: "relative",
              border: "none",
              px: 2,
              py: 0.75,
              borderRadius: 999,
              cursor: "pointer",
              fontSize: "var(--fs-sm)",
              fontWeight: 700,
              fontFamily: "inherit",
              color: active ? "var(--white)" : "var(--slate-500)",
              bgcolor: active ? "var(--slate-900)" : "transparent",
              transition: "all 0.15s ease",
              "&:hover": { color: active ? "var(--white)" : "var(--slate-900)" },
            }}
          >
            {t.label}
            {!active && !!badge && (
              <Box
                sx={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  minWidth: 16,
                  height: 16,
                  px: 0.4,
                  borderRadius: 999,
                  bgcolor: "var(--red-600)",
                  color: "var(--white)",
                  fontSize: "var(--fs-2xs)",
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {badge}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
