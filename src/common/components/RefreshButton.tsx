import { Tooltip } from "@mui/material";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import Button from "../../ui/Button";

interface RefreshButtonProps {
  onRefresh: () => void;
  loading?: boolean;
  tooltipTitle?: string;
  className?: string;
  sx?: object;
}

// Same bordered-icon-box treatment as BulkDeleteButton/FilterMenu's trigger,
// so every icon control in a table toolbar reads as one consistent group.
export default function RefreshButton({
  onRefresh,
  loading = false,
  tooltipTitle = "Refresh",
  className,
  sx,
}: RefreshButtonProps) {
  return (
    <Tooltip title={tooltipTitle}>
      <span className={className} style={{ display: "inline-block" }}>
        <Button
          variantColor="transparent"
          onClick={onRefresh}
          disabled={loading}
          startIcon={
            <RefreshRounded
              sx={{
                fontSize: 18,
                color: "var(--blue-600, #2563eb)",
                transition: "color 0.15s ease",
                animation: loading ? "spin 0.8s linear infinite" : "none",
                "@keyframes spin": {
                  from: { transform: "rotate(0deg)" },
                  to: { transform: "rotate(360deg)" },
                },
              }}
            />
          }
          sx={{
            float: "none",
            height: 36,
            width: 36,
            minWidth: 36,
            padding: 0,
            border: "1px solid rgba(0, 0, 0, 0.12)",
            borderRadius: "var(--border-radius-md, 6px)",
            bgcolor: "#ffffff",
            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            color: "var(--blue-600, #2563eb)",
            transition:
              "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease",
            "& .MuiButton-startIcon": { margin: 0 },
            "&:hover": {
              borderColor: "var(--blue-300, #93c5fd)",
              bgcolor: "var(--blue-50, #eff6ff)",
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
