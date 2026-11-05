import { Box } from "@mui/material";
import type { ReactNode } from "react";
import { surfaceSx } from "./surface";

// A white card holding a list: a toolbar (filters, search, counts) on top and
// the table or its empty state below. Pair with <Table bare /> so the table
// doesn't draw a second border inside this one.
export default function TableCard({ toolbar, children }: { toolbar: ReactNode; children: ReactNode }) {
  return (
    <Box
      component="section"
      sx={{
        ...surfaceSx,
        overflow: "hidden",
        minWidth: 0,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1.5,
          px: 2,
          py: 1.25,
          borderBottom: "1px solid var(--slate-100)",
        }}
      >
        {toolbar}
      </Box>
      {children}
    </Box>
  );
}
