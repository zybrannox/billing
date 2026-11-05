import { useState } from "react";
import { Box, Menu, MenuItem } from "@mui/material";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import { VIEWS } from "./invoiceViews";

// The view picker, doubling as the page's title.
export default function ViewPicker({
  view,
  counts,
  onChange,
}: {
  view: string;
  counts?: Record<string, number>;
  onChange: (view: string) => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const current = VIEWS.find((v) => v.value === view) ?? VIEWS[0];
  return (
    <>
      <Box
        component="button"
        type="button"
        aria-haspopup="menu"
        onClick={(e) => setAnchor(e.currentTarget as HTMLElement)}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.25,
          p: 0,
          border: "none",
          background: "none",
          cursor: "pointer",
          font: "inherit",
          fontSize: "var(--fs-5xl)",
          fontWeight: 700,
          lineHeight: 1.2,
          color: "var(--slate-900)",
          whiteSpace: "nowrap",
          "&:hover": { color: "var(--blue-700)" },
          "&:focus-visible": { outline: "2px solid var(--blue-500)", outlineOffset: 2, borderRadius: "4px" },
        }}
      >
        {current.label}
        <KeyboardArrowDownRoundedIcon sx={{ color: "var(--blue-600)" }} />
      </Box>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {VIEWS.map((option) => (
          <MenuItem
            key={option.value}
            selected={option.value === view}
            onClick={() => {
              setAnchor(null);
              onChange(option.value);
            }}
            sx={{ minWidth: 200, justifyContent: "space-between", gap: 3, fontSize: "var(--fs-sm)" }}
          >
            {option.label}
            <Box component="span" sx={{ color: "var(--slate-500)", fontWeight: 600 }}>{counts?.[option.value] ?? ""}</Box>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
