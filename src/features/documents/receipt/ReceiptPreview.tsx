import { useEffect, useRef } from "react";
import { Box } from "@mui/material";
import { receiptElement } from "./printReceipt";
import type { PaperWidth, ReceiptLine } from "./receipt";

// The receipt on screen, drawn by the very same code that prints it.
export default function ReceiptPreview({ lines, paper }: { lines: ReceiptLine[]; paper: PaperWidth }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.replaceChildren(receiptElement(lines, paper));
  }, [lines, paper]);
  return (
    <Box sx={{ bgcolor: "var(--slate-100)", borderRadius: "10px", p: 2, display: "flex", justifyContent: "center", overflowX: "auto" }}>
      <Box sx={{ bgcolor: "var(--white)", p: "4mm", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.15)", zoom: 1.25 }}>
        <div ref={ref} aria-label="Receipt preview" />
      </Box>
    </Box>
  );
}
