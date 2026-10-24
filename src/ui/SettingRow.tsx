import { Box, Switch, Typography } from "@mui/material";
import type { ReactNode } from "react";

// One setting: what it is and why on the left, the control on the right.
// Stacks on a phone. Rows divide with a hairline, so a panel of settings reads
// as a tidy list instead of a wall of form fields.
export function SettingRow({
  label,
  description,
  children,
  align = "center",
}: {
  label: string;
  description?: string;
  children: ReactNode;
  align?: "center" | "start";
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) minmax(0, 1.4fr)" },
        gap: { xs: 0.75, sm: 2 },
        alignItems: align,
        py: 1,
        "& + &": { borderTop: "1px solid var(--slate-100)" },
      }}
    >
      <Box>
        <Typography sx={{ fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--slate-900)" }}>{label}</Typography>
        {description && (
          <Typography sx={{ fontSize: "var(--fs-xs)", color: "var(--slate-500)", lineHeight: 1.35 }}>{description}</Typography>
        )}
      </Box>
      <Box sx={{ minWidth: 0 }}>{children}</Box>
    </Box>
  );
}

// A setting that is simply on or off.
export function SwitchRow({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 3,
        py: 1,
        opacity: disabled ? 0.55 : 1,
        "& + &": { borderTop: "1px solid var(--slate-100)" },
      }}
    >
      <Box>
        <Typography sx={{ fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--slate-900)" }}>{label}</Typography>
        {description && (
          <Typography sx={{ fontSize: "var(--fs-xs)", color: "var(--slate-500)", lineHeight: 1.35 }}>{description}</Typography>
        )}
      </Box>
      <Switch size="small" checked={checked} disabled={disabled} onChange={(_, v) => onChange(v)} inputProps={{ "aria-label": label }} />
    </Box>
  );
}
