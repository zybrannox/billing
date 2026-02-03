import { IconButton, Tooltip } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import { GridDownloadIcon } from "@mui/x-data-grid";
import { DeleteRounded } from "@mui/icons-material";

interface CrudActionsProps {
  edit?: boolean;
  delete?: boolean;
  toggle?: boolean;
  download?: boolean;

  onEdit?: () => void;
  onDelete?: () => void;
  onToggle?: () => void;
  onDownload?: () => void;

  isActive?: boolean;
  size?: "small" | "medium";
}

const CrudActions = ({
  edit = false,
  delete: del = false,
  toggle = false,
  download = false,

  onEdit,
  onDelete,
  onToggle,
  onDownload,

  isActive = false,
  size = "medium",
}: CrudActionsProps) => {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      {download && (
        <Tooltip title="Download">
          <IconButton
            size={size}
            onClick={onDownload}
            sx={{
              // backgroundColor: "#0dcaf0", // Info / Download blue
              color: "#fff",
              padding: "0",
              borderRadius: "var(--border-radius-md)",
              transition: "0.2s",
              "&:hover": {
                padding: "0",
                // backgroundColor: "#0bbcd6",
              },
            }}
          >
            <GridDownloadIcon fontSize={size} sx={{ color: "#0dcaf0" }} />
          </IconButton>
        </Tooltip>
      )}
      {edit && (
        <Tooltip title="Edit">
          <IconButton
            size={size}
            onClick={onEdit}
            sx={{
              // backgroundColor: "#0D6EFD", // Primary Blue
              color: "#fff",
              padding: "0",
              borderRadius: "var(--border-radius-md)",
              transition: "0.2s",
              "&:hover": {
                padding: "0",
                // backgroundColor: "#0B5ED7", // Darker Blue (consistent hover style)
              },
            }}
          >
            <EditIcon fontSize={size} sx={{ color: "#0D6EFD" }} />
          </IconButton>
        </Tooltip>
      )}

      {del && (
        <Tooltip title="Delete">
          <IconButton
            size={size}
            onClick={onDelete}
            sx={{
              // backgroundColor: "#DC3545", // Bootstrap Danger
              color: "#fff",
              padding: "0",
              borderRadius: "var(--border-radius-md)",
              transition: "0.2s",
              "&:hover": {
                padding: "0",
                // backgroundColor: "#BB2D3B", // Darker Red
              },
            }}
          >
            <DeleteRounded fontSize={size} sx={{ color: "#DC3545" }} />
          </IconButton>
        </Tooltip>
      )}

      {toggle && (
        <Tooltip title={isActive ? "Deactivate" : "Activate"}>
          <IconButton
            size={size}
            onClick={onToggle}
            sx={{
              backgroundColor: isActive ? "#28A745" : "#6C757D", // Success or Secondary
              color: "#fff",
              padding: "0.45rem",
              borderRadius: "var(--border-radius-md)",
              transition: "0.2s",
              "&:hover": {
                backgroundColor: isActive ? "#218838" : "#5A6268", // Darker for both
              },
            }}
          >
            {isActive ? (
              <ToggleOnIcon fontSize={size} />
            ) : (
              <ToggleOffIcon fontSize={size} />
            )}
          </IconButton>
        </Tooltip>
      )}
    </div>
  );
};

export default CrudActions;
