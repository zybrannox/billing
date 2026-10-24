import { Box, CircularProgress, Typography } from "@mui/material";
import Button from "./Button";

// Appears at the bottom of the screen only while there are unsaved changes, so
// it is obvious that something is pending and where to confirm it - and gone
// when there is nothing to do. Pass `saved` to show a brief confirmation.
export default function SaveBar({
  visible,
  saving,
  disabled = false,
  message = "You have unsaved changes",
  error,
  onSave,
  onDiscard,
}: {
  visible: boolean;
  saving: boolean;
  disabled?: boolean;
  message?: string;
  error?: string;
  onSave: () => void;
  onDiscard: () => void;
}) {
  if (!visible) return null;
  return (
    <Box
      role="region"
      aria-label="Unsaved changes"
      sx={{
        position: "sticky",
        bottom: 16,
        zIndex: 5,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        flexWrap: "wrap",
        px: 2,
        py: 1,
        bgcolor: "var(--slate-900)",
        color: "var(--white)",
        borderRadius: "10px",
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.25)",
      }}
    >
      <Box>
        <Typography sx={{ fontSize: "var(--fs-sm)", fontWeight: 600 }}>{message}</Typography>
        {error && <Typography sx={{ fontSize: "var(--fs-sm)", color: "var(--red-300)" }}>{error}</Typography>}
      </Box>
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button variantColor="transparent" disabled={saving} onClick={onDiscard} sx={{ color: "var(--white)", "&:hover": { bgcolor: "rgba(255,255,255,0.12)" } }}>
          Discard
        </Button>
        <Button disabled={saving || disabled} onClick={onSave}>
          {saving ? <CircularProgress size={16} sx={{ color: "inherit" }} /> : "Save changes"}
        </Button>
      </Box>
    </Box>
  );
}
