import { Box, Typography } from "@mui/material";
import type { ReactNode } from "react";

// A short list of records as clean rows (title + detail on the left, anything
// at all on the right) - the friendlier alternative to a full data grid when a
// list has a handful of items and one or two things you can do to each.
export function ItemList({ children }: { children: ReactNode }) {
  return <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>{children}</Box>;
}

export function ItemRow({
  title,
  detail,
  trailing,
  muted = false,
}: {
  title: string;
  detail?: ReactNode;
  trailing?: ReactNode;
  muted?: boolean;
}) {
  return (
    <Box
      component="li"
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        px: 2,
        py: 0.9,
        borderTop: "1px solid var(--slate-100)",
        "&:first-of-type": { borderTop: "1px solid var(--slate-100)" },
        "&:hover": { bgcolor: "var(--slate-50)" },
      }}
    >
      <Box sx={{ minWidth: 0, opacity: muted ? 0.55 : 1 }}>
        <Typography sx={{ fontSize: "var(--fs-md)", fontWeight: 600, color: "var(--slate-900)" }} noWrap>
          {title}
        </Typography>
        {detail && <Typography sx={{ fontSize: "var(--fs-xs)", color: "var(--slate-500)" }}>{detail}</Typography>}
      </Box>
      {trailing && <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexShrink: 0 }}>{trailing}</Box>}
    </Box>
  );
}
