import { Box } from "@mui/material";

export type InvoiceMode = "new" | "existing";

// Whether this invoice is for a brand-new job or a project already being tracked.
export default function InvoiceModeToggle({ mode, onChange }: { mode: InvoiceMode; onChange: (mode: InvoiceMode) => void }) {
  return (
    <Box sx={{ display: "flex", bgcolor: "var(--slate-100)", borderRadius: 999, p: 0.5, gap: 0.5, flexShrink: 0 }}>
      {(["new", "existing"] as const).map((m) => {
        const active = m === mode;
        return (
          <Box
            key={m}
            component="button"
            type="button"
            onClick={() => onChange(m)}
            sx={{
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
            {m === "new" ? "New Job" : "Existing Project"}
          </Box>
        );
      })}
    </Box>
  );
}
