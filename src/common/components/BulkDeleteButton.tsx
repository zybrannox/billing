import { Badge, Tooltip } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import Button from "../../ui/Button";

interface BulkDeleteButtonProps {
  selectedCount: number;
  onDelete: () => void;
  tooltipTitle?: string;
  disabledTooltipTitle?: string;
  className?: string;
  sx?: object;
}

export default function BulkDeleteButton({
  selectedCount,
  onDelete,
  tooltipTitle = "Delete selected items",
  disabledTooltipTitle = "Select items to delete",
  className,
  sx,
}: BulkDeleteButtonProps) {
  const isDisabled = selectedCount === 0;

  return (
    <Tooltip
      title={isDisabled ? disabledTooltipTitle : tooltipTitle}
      slotProps={{
        popper: {
          sx: { pointerEvents: "none" },
        },
      }}
    >
      <span className={className} style={{ display: "inline-block" }}>
        <Button
          variantColor="transparent"
          onClick={onDelete}
          disabled={isDisabled}
          startIcon={
            <Badge
              badgeContent={selectedCount}
              sx={{
                "& .MuiBadge-badge": {
                  fontSize: "0.65rem",
                  height: 16,
                  minWidth: 16,
                  padding: "0 4px",
                  bgcolor: "var(--red-500, #ef4444)",
                  color: "#ffffff",
                  fontWeight: 600,
                },
              }}
            >
              <DeleteIcon
                sx={{
                  fontSize: 18,
                  color: !isDisabled
                    ? "var(--red-600, #dc2626)"
                    : "text.disabled",
                  transition: "color 0.15s ease",
                }}
              />
            </Badge>
          }
          sx={{
            float: "none",
            height: 36,
            width: 36,
            minWidth: 36,
            padding: 0,
            // A plain "transparent" icon has nothing to visually anchor it
            // to - it read as a stray, disconnected icon wherever it ended
            // up (especially wrapping alone on mobile). Same bordered-box
            // treatment as the filter trigger right next to it, so both
            // icon controls read as one consistent group.
            border: "1px solid rgba(0, 0, 0, 0.12)",
            borderRadius: "var(--border-radius-md, 6px)",
            bgcolor: "#ffffff",
            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            color: "var(--red-600, #dc2626)",
            transition:
              "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease",
            "& .MuiButton-startIcon": { margin: 0 },
            "&:hover": {
              borderColor: isDisabled
                ? "rgba(0, 0, 0, 0.12)"
                : "var(--red-300, #fca5a5)",
              bgcolor: isDisabled ? "#ffffff" : "var(--red-50, #fef2f2)",
            },
            "&.Mui-disabled": {
              bgcolor: "#ffffff",
              borderColor: "rgba(0, 0, 0, 0.12)",
            },
            ...sx,
          }}
        />
      </span>
    </Tooltip>
  );
}