import { Box } from "@mui/material";

// Small pill-radio group - same visual language as the New Job/Existing
// Project mode toggle in GenerateInvoice.tsx, used for small closed-set
// fields (Priority, Client Status) without pulling in the full
// CustomForm/react-hook-form machinery on a page that manages its own
// state directly. Shared with GenerateQuotation.tsx / QuotationView.tsx's
// convert-to-invoice step, which needs the exact same two fields.
export default function PillRadioGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; color: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <Box sx={{ display: "flex", gap: 1 }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Box
            key={opt.value}
            component="button"
            type="button"
            onClick={() => onChange(opt.value)}
            sx={{
              border: `1.5px solid ${active ? opt.color : "var(--slate-200)"}`,
              bgcolor: active ? opt.color : "var(--white)",
              color: active ? "var(--white)" : "var(--slate-600)",
              borderRadius: 999,
              px: 1.5,
              py: 0.5,
              fontSize: "0.8rem",
              fontWeight: 700,
              fontFamily: "inherit",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {opt.value}
          </Box>
        );
      })}
    </Box>
  );
}
