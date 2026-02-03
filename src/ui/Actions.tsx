import {
  IconButton,
  Tooltip,
  Box,
  Stack,
  Typography,
  Divider,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import { GridDownloadIcon } from "@mui/x-data-grid";
import { DeleteRounded, Info } from "@mui/icons-material";
import { formatDateTime } from "../utils/dateFormatter";

interface CrudActionsProps {
  edit?: boolean;
  delete?: boolean;
  toggle?: boolean;
  download?: boolean;
  info?: boolean;
  data?: any;

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
  info = false,
  data,

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

      {info && data && (
        <Tooltip
          title={
            <Box sx={{ p: 1, minWidth: 220 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                  mb: 1.5,
                  color: "#90caf9",
                  fontSize: "0.85rem",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                }}
              >
                Project Details
              </Typography>

              <Stack spacing={1}>
                {[
                  { label: "Type", value: data.project_type },
                  { label: "Assignee", value: data.assigned_to },
                  {
                    label: "Start Date",
                    value: formatDateTime(data.start_date),
                  },
                  {
                    label: "Delivery",
                    value: formatDateTime(data.delivery_date),
                  },
                  { label: "Priority", value: data.priority },
                  { label: "Status", value: data.client_status },
                ].map((item, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 2,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        color: "rgba(255,255,255,0.6)",
                        fontSize: "0.75rem",
                      }}
                    >
                      {item.label}:
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 500, fontSize: "0.75rem" }}
                    >
                      {item.value}
                    </Typography>
                  </Box>
                ))}

                <Divider sx={{ bgcolor: "rgba(255,255,255,0.15)", my: 0.5 }} />

                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.6)",
                      fontSize: "0.75rem",
                      display: "block",
                      mb: 0.5,
                    }}
                  >
                    Description:
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      lineHeight: 1.4,
                      opacity: 0.9,
                      fontSize: "0.75rem",
                      wordBreak: "break-word",
                    }}
                  >
                    {data.description || "No description provided."}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          }
          arrow
          placement="top"
        >
          <IconButton
            size={size}
            sx={{
              color: "#fff",
              padding: "0",
              borderRadius: "var(--border-radius-md)",
              transition: "0.2s",
            }}
          >
            <Info fontSize={size} sx={{ color: "#0dcaf0" }} />
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
