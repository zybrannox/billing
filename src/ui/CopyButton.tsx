import { IconButton, Tooltip } from "@mui/material";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";

// A small copy icon with a tooltip. `label` says what gets copied ("Copy item")
// and doubles as the accessible name; what copying means is up to `onClick`.
export default function CopyButton({
  label = "Copy",
  onClick,
  disabled = false,
}: {
  label?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Tooltip title={label}>
      {/* A disabled button can't fire the events a tooltip listens for. */}
      <span>
        <IconButton
          size="small"
          aria-label={label}
          onClick={onClick}
          disabled={disabled}
          sx={{
            color: "var(--slate-400)",
            "&:hover": { color: "var(--blue-600)", bgcolor: "var(--blue-50)" },
            "&.Mui-disabled": { opacity: 0.3 },
          }}
        >
          <ContentCopyRoundedIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </span>
    </Tooltip>
  );
}
