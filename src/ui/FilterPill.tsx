import { Box } from "@mui/material";

// One option of a row of filters, with an optional count beside its label.
export default function FilterPill({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Box
      component="button"
      type="button"
      aria-pressed={active}
      onClick={onClick}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        px: 1.25,
        py: 0.5,
        border: "1px solid",
        borderColor: active ? "var(--blue-600)" : "var(--slate-200)",
        borderRadius: "999px",
        bgcolor: active ? "var(--blue-600)" : "var(--white)",
        color: active ? "var(--white)" : "var(--slate-700)",
        fontFamily: "inherit",
        fontSize: "var(--fs-xs)",
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
        flexShrink: 0,
        "&:hover": { borderColor: active ? "var(--blue-700)" : "var(--slate-300)" },
      }}
    >
      {label}
      {count !== undefined && (
        <Box component="span" sx={{ opacity: active ? 0.85 : 0.6, fontWeight: 700 }}>
          {count}
        </Box>
      )}
    </Box>
  );
}
