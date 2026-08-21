import { useState } from "react";
import {
  IconButton,
  Tooltip,
  Box,
  Stack,
  Typography,
  Divider,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  EditRounded,
  DeleteForeverRounded,
  ToggleOffRounded,
  ToggleOnRounded,
  DesignServicesRounded,
  LocalShippingRounded,
  LocalPrintshopRounded,
  CheckCircleRounded,
  MoreVertRounded,
  DownloadForOfflineRounded,
  InfoRounded,
  VisibilityRounded,
  ReceiptLongRounded,
  VpnKeyRounded,
} from "@mui/icons-material";
import { formatDateTime } from "../utils/dateFormatter";

interface MilestoneMeta {
  at: string;
  by: string;
}

interface CrudActionsProps {
  edit?: boolean;
  delete?: boolean;
  toggle?: boolean;
  download?: boolean;
  info?: boolean;
  preview?: boolean;
  invoice?: boolean;
  orderMilestones?: boolean;
  changePassword?: boolean;
  data?: any;

  onEdit?: () => void;
  onDelete?: () => void;
  onToggle?: () => void;
  onDownload?: () => void;
  onPreview?: () => void;
  onGenerateInvoice?: () => void;
  onMarkDesignCompleted?: () => void;
  onMarkPrintCompleted?: () => void;
  onMarkDelivered?: () => void;
  onChangePassword?: () => void;

  isActive?: boolean;
  size?: "small" | "medium";
  designCompletedMeta?: MilestoneMeta | null;
  printCompletedMeta?: MilestoneMeta | null;
  deliveredMeta?: MilestoneMeta | null;
  // Delivery also requires print_status === "Completed" - passed straight
  // from the row rather than duplicated as another boolean prop.
  printStatus?: string;
}

const ProjectDetailsTooltip = ({ data }: { data: any }) => (
  <Box sx={{ p: 2, width: 260 }}>
    <Typography
      sx={{
        fontWeight: 600,
        mb: 1.25,
        color: "#0F172A",
        fontSize: "0.8125rem",
      }}
    >
      Project Details
    </Typography>

    <Stack spacing={0.75}>
      {[
        { label: "Type", value: data?.project_type },
        { label: "Assignee", value: data?.assigned_to },
        { label: "Start Date", value: formatDateTime(data?.start_date) },
        { label: "Delivery", value: formatDateTime(data?.delivery_date) },
        { label: "Priority", value: data?.priority },
        { label: "Client Status", value: data?.client_status },
        { label: "Print Status", value: data?.print_status },
        {
          label: "Design Completed",
          value: data?.design_completed_at
            ? `${formatDateTime(data.design_completed_at)} by ${data.design_completed_by}`
            : "Not yet",
        },
        {
          label: "Delivered",
          value: data?.delivered_at
            ? `${formatDateTime(data.delivered_at)} by ${data.delivered_by}`
            : "Not yet",
        },
      ].map((item, idx) => (
        <Box
          key={idx}
          sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}
        >
          <Typography
            variant="caption"
            sx={{ fontWeight: 500, color: "#64748B", fontSize: "0.75rem" }}
          >
            {item.label}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 500,
              color: "#0F172A",
              fontSize: "0.75rem",
              textAlign: "right",
            }}
          >
            {item.value || "N/A"}
          </Typography>
        </Box>
      ))}
    </Stack>

    <Divider sx={{ borderColor: "#E2E8F0", my: 1.25 }} />

    <Box>
      <Typography
        variant="caption"
        sx={{
          fontWeight: 500,
          color: "#64748B",
          fontSize: "0.75rem",
          display: "block",
          mb: 0.375,
        }}
      >
        Description
      </Typography>
      <Typography
        variant="caption"
        sx={{
          display: "block",
          lineHeight: 1.5,
          color: "#334155",
          fontSize: "0.75rem",
          wordBreak: "break-word",
        }}
      >
        {data?.description || "No description provided."}
      </Typography>
    </Box>
  </Box>
);

const CrudActions = ({
  edit = false,
  delete: del = false,
  toggle = false,
  download = false,
  info = false,
  preview = false,
  invoice = false,
  orderMilestones = false,
  changePassword = false,
  data,

  onEdit,
  onDelete,
  onToggle,
  onDownload,
  onPreview,
  onGenerateInvoice,
  onMarkDesignCompleted,
  onMarkPrintCompleted,
  onMarkDelivered,
  onChangePassword,

  isActive = false,
  size = "small",
  designCompletedMeta,
  printCompletedMeta,
  deliveredMeta,
  printStatus,
}: CrudActionsProps) => {
  const isDesignCompleted = !!designCompletedMeta;
  const isPrintCompleted = printStatus === "Completed";
  const isDelivered = !!deliveredMeta;
  const canDeliver = isDesignCompleted && isPrintCompleted;
  // Same server-enforced rule as the design/deliver buttons (see
  // service_update in app/projects/service.py): print can't be marked
  // Completed until the design phase is.
  const canCompletePrint = isDesignCompleted && !isPrintCompleted;

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchor);
  const closeMenu = () => setMenuAnchor(null);
  const runAndClose = (fn?: () => void) => () => {
    closeMenu();
    fn?.();
  };

  const actionIconSx = {
    p: size === "small" ? 0.625 : 0.75,
    borderRadius: "8px",
    transition: "all 0.15s ease-in-out",
    "&:active": {
      transform: "scale(0.95)",
    },
  };

  // Renders ProjectDetailsTooltip as a light bordered card - matching every
  // other floating panel in the app (FilterMenu's popover, the account
  // Menu) - instead of MUI Tooltip's default small dark bubble, which is
  // what the tooltip's own light-on-dark text colors used to assume.
  const detailsTooltipSlotProps = {
    tooltip: {
      sx: {
        bgcolor: "#ffffff",
        p: 0,
        maxWidth: "none",
        border: "1px solid #E2E8F0",
        borderRadius: "var(--border-radius-md, 8px)",
        boxShadow: "0 12px 32px rgba(15, 23, 42, 0.14)",
      },
    },
  };

  const milestoneButtons = orderMilestones && (
    <>
      <Tooltip
        title={
          isDesignCompleted
            ? `Design completed on ${formatDateTime(designCompletedMeta!.at)} by ${designCompletedMeta!.by}`
            : "Mark design as completed"
        }
      >
        <span>
          <IconButton
            size={size}
            onClick={onMarkDesignCompleted}
            disabled={isDesignCompleted}
            sx={{
              ...actionIconSx,
              color: isDesignCompleted ? "#059669" : "#4F46E5",
              backgroundColor: isDesignCompleted ? "rgba(16, 185, 129, 0.08)" : "rgba(79, 70, 229, 0.08)",
              border: `1px solid ${isDesignCompleted ? "rgba(16, 185, 129, 0.2)" : "rgba(79, 70, 229, 0.2)"}`,
              "&:hover": {
                backgroundColor: isDesignCompleted ? "rgba(16, 185, 129, 0.15)" : "rgba(79, 70, 229, 0.15)",
              },
              "&.Mui-disabled": { opacity: 0.95 },
            }}
          >
            {isDesignCompleted ? (
              <CheckCircleRounded sx={{ fontSize: size === "small" ? "1.125rem" : "1.25rem" }} />
            ) : (
              <DesignServicesRounded sx={{ fontSize: size === "small" ? "1.125rem" : "1.25rem" }} />
            )}
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip
        title={
          isPrintCompleted && printCompletedMeta
            ? `Print completed on ${formatDateTime(printCompletedMeta.at)} by ${printCompletedMeta.by}`
            : isPrintCompleted
              ? "Print marked as completed"
              : !isDesignCompleted
                ? "Complete the design first"
                : "Mark print as completed"
        }
      >
        <span>
          <IconButton
            size={size}
            onClick={onMarkPrintCompleted}
            disabled={isPrintCompleted || !canCompletePrint}
            sx={{
              ...actionIconSx,
              color: isPrintCompleted
                ? "#059669"
                : canCompletePrint
                ? "#D97706"
                : "#94A3B8",
              backgroundColor: isPrintCompleted
                ? "rgba(16, 185, 129, 0.08)"
                : canCompletePrint
                ? "rgba(217, 119, 6, 0.08)"
                : "rgba(148, 163, 184, 0.08)",
              border: `1px solid ${
                isPrintCompleted
                  ? "rgba(16, 185, 129, 0.2)"
                  : canCompletePrint
                  ? "rgba(217, 119, 6, 0.2)"
                  : "rgba(148, 163, 184, 0.18)"
              }`,
              "&:hover": {
                backgroundColor: isPrintCompleted
                  ? "rgba(16, 185, 129, 0.15)"
                  : "rgba(217, 119, 6, 0.15)",
              },
              "&.Mui-disabled": { opacity: isPrintCompleted ? 0.95 : 0.45 },
            }}
          >
            {isPrintCompleted ? (
              <CheckCircleRounded sx={{ fontSize: size === "small" ? "1.125rem" : "1.25rem" }} />
            ) : (
              <LocalPrintshopRounded sx={{ fontSize: size === "small" ? "1.125rem" : "1.25rem" }} />
            )}
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip
        title={
          isDelivered
            ? `Delivered on ${formatDateTime(deliveredMeta!.at)} by ${deliveredMeta!.by}`
            : !isDesignCompleted
              ? "Complete the design first"
              : !isPrintCompleted
                ? "Mark print status as Completed first"
                : "Mark order as delivered"
        }
      >
        <span>
          <IconButton
            size={size}
            onClick={onMarkDelivered}
            disabled={isDelivered || !canDeliver}
            sx={{
              ...actionIconSx,
              color: isDelivered
                ? "#059669"
                : canDeliver
                ? "#0284C7"
                : "#94A3B8",
              backgroundColor: isDelivered
                ? "rgba(16, 185, 129, 0.08)"
                : canDeliver
                ? "rgba(2, 132, 199, 0.08)"
                : "rgba(148, 163, 184, 0.08)",
              border: `1px solid ${
                isDelivered
                  ? "rgba(16, 185, 129, 0.2)"
                  : canDeliver
                  ? "rgba(2, 132, 199, 0.2)"
                  : "rgba(148, 163, 184, 0.18)"
              }`,
              "&:hover": {
                backgroundColor: isDelivered
                  ? "rgba(16, 185, 129, 0.15)"
                  : "rgba(2, 132, 199, 0.15)",
              },
              "&.Mui-disabled": { opacity: isDelivered ? 0.95 : 0.45 },
            }}
          >
            {isDelivered ? (
              <CheckCircleRounded sx={{ fontSize: size === "small" ? "1.125rem" : "1.25rem" }} />
            ) : (
              <LocalShippingRounded sx={{ fontSize: size === "small" ? "1.125rem" : "1.25rem" }} />
            )}
          </IconButton>
        </span>
      </Tooltip>
    </>
  );

  if (orderMilestones) {
    const hasMoreActions = download || invoice || preview || edit || del || info || toggle;

    return (
      <Box sx={{ display: "inline-flex", gap: 0.75, alignItems: "center" }}>
        {milestoneButtons}

        {hasMoreActions && (
          <>
            <Tooltip title="More actions">
              <IconButton
                size={size}
                onClick={(e) => setMenuAnchor(e.currentTarget)}
                sx={{
                  ...actionIconSx,
                  color: "#64748B",
                  backgroundColor: "rgba(100, 116, 139, 0.06)",
                  border: "1px solid rgba(100, 116, 139, 0.15)",
                  "&:hover": {
                    backgroundColor: "rgba(100, 116, 139, 0.12)",
                    color: "#334155",
                  },
                }}
              >
                <MoreVertRounded sx={{ fontSize: size === "small" ? "1.125rem" : "1.25rem" }} />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={menuAnchor}
              open={menuOpen}
              onClose={closeMenu}
              slotProps={{
                paper: {
                  elevation: 2,
                  sx: {
                    mt: 0.75,
                    minWidth: 160,
                    borderRadius: "10px",
                    border: "1px solid #E2E8F0",
                    boxShadow: "0px 8px 20px -4px rgba(15, 23, 42, 0.08)",
                  },
                },
              }}
            >
              {download && (
                <MenuItem onClick={runAndClose(onDownload)} sx={{ py: 0.875 }}>
                  <ListItemIcon>
                    <DownloadForOfflineRounded fontSize="small" sx={{ color: "#0284C7" }} />
                  </ListItemIcon>
                  <ListItemText primaryTypographyProps={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                    Download All
                  </ListItemText>
                </MenuItem>
              )}
              {invoice && (
                <MenuItem onClick={runAndClose(onGenerateInvoice)} sx={{ py: 0.875 }}>
                  <ListItemIcon>
                    <ReceiptLongRounded fontSize="small" sx={{ color: "#059669" }} />
                  </ListItemIcon>
                  <ListItemText primaryTypographyProps={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                    Invoice
                  </ListItemText>
                </MenuItem>
              )}
              {preview && (
                <MenuItem onClick={runAndClose(onPreview)} sx={{ py: 0.875 }}>
                  <ListItemIcon>
                    <VisibilityRounded fontSize="small" sx={{ color: "#6366F1" }} />
                  </ListItemIcon>
                  <ListItemText primaryTypographyProps={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                    Preview
                  </ListItemText>
                </MenuItem>
              )}
              {edit && (
                <MenuItem onClick={runAndClose(onEdit)} sx={{ py: 0.875 }}>
                  <ListItemIcon>
                    <EditRounded fontSize="small" sx={{ color: "#2563EB" }} />
                  </ListItemIcon>
                  <ListItemText primaryTypographyProps={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                    Edit
                  </ListItemText>
                </MenuItem>
              )}
              {toggle && (
                <MenuItem onClick={runAndClose(onToggle)} sx={{ py: 0.875 }}>
                  <ListItemIcon>
                    {isActive ? (
                      <ToggleOnRounded fontSize="small" sx={{ color: "#059669" }} />
                    ) : (
                      <ToggleOffRounded fontSize="small" sx={{ color: "#64748B" }} />
                    )}
                  </ListItemIcon>
                  <ListItemText primaryTypographyProps={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                    {isActive ? "Deactivate" : "Activate"}
                  </ListItemText>
                </MenuItem>
              )}
              {info && data && (
                <Tooltip
                  title={<ProjectDetailsTooltip data={data} />}
                  placement="left"
                  slotProps={detailsTooltipSlotProps}
                >
                  <MenuItem onClick={closeMenu} sx={{ py: 0.875 }}>
                    <ListItemIcon>
                      <InfoRounded fontSize="small" sx={{ color: "#0284C7" }} />
                    </ListItemIcon>
                    <ListItemText primaryTypographyProps={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                      Details
                    </ListItemText>
                  </MenuItem>
                </Tooltip>
              )}
              {del && (
                <MenuItem onClick={runAndClose(onDelete)} sx={{ color: "#E11D48", py: 0.875 }}>
                  <ListItemIcon>
                    <DeleteForeverRounded fontSize="small" sx={{ color: "#E11D48" }} />
                  </ListItemIcon>
                  <ListItemText primaryTypographyProps={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                    Delete
                  </ListItemText>
                </MenuItem>
              )}
            </Menu>
          </>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ display: "inline-flex", gap: 0.625, alignItems: "center" }}>
      {download && (
        <Tooltip title="Download">
          <IconButton
            size={size}
            onClick={onDownload}
            sx={{
              ...actionIconSx,
              color: "#0284C7",
              backgroundColor: "rgba(2, 132, 199, 0.06)",
              "&:hover": { backgroundColor: "rgba(2, 132, 199, 0.12)" },
            }}
          >
            <DownloadForOfflineRounded sx={{ fontSize: size === "small" ? "1.125rem" : "1.25rem" }} />
          </IconButton>
        </Tooltip>
      )}

      {preview && (
        <Tooltip title="Preview">
          <IconButton
            size={size}
            onClick={onPreview}
            sx={{
              ...actionIconSx,
              color: "#6366F1",
              backgroundColor: "rgba(99, 102, 241, 0.06)",
              "&:hover": { backgroundColor: "rgba(99, 102, 241, 0.12)" },
            }}
          >
            <VisibilityRounded sx={{ fontSize: size === "small" ? "1.125rem" : "1.25rem" }} />
          </IconButton>
        </Tooltip>
      )}

      {invoice && (
        <Tooltip title="Generate Invoice">
          <IconButton
            size={size}
            onClick={onGenerateInvoice}
            sx={{
              ...actionIconSx,
              color: "#059669",
              backgroundColor: "rgba(5, 150, 105, 0.06)",
              "&:hover": { backgroundColor: "rgba(5, 150, 105, 0.12)" },
            }}
          >
            <ReceiptLongRounded sx={{ fontSize: size === "small" ? "1.125rem" : "1.25rem" }} />
          </IconButton>
        </Tooltip>
      )}

      {edit && (
        <Tooltip title="Edit">
          <IconButton
            size={size}
            onClick={onEdit}
            sx={{
              ...actionIconSx,
              color: "#2563EB",
              backgroundColor: "rgba(37, 99, 235, 0.06)",
              "&:hover": { backgroundColor: "rgba(37, 99, 235, 0.12)" },
            }}
          >
            <EditRounded sx={{ fontSize: size === "small" ? "1.125rem" : "1.25rem" }} />
          </IconButton>
        </Tooltip>
      )}

      {changePassword && (
        <Tooltip title="Change Password">
          <IconButton
            size={size}
            onClick={onChangePassword}
            sx={{
              ...actionIconSx,
              color: "#7C3AED",
              backgroundColor: "rgba(124, 58, 237, 0.06)",
              "&:hover": { backgroundColor: "rgba(124, 58, 237, 0.12)" },
            }}
          >
            <VpnKeyRounded sx={{ fontSize: size === "small" ? "1.125rem" : "1.25rem" }} />
          </IconButton>
        </Tooltip>
      )}

      {del && (
        <Tooltip title="Delete">
          <IconButton
            size={size}
            onClick={onDelete}
            sx={{
              ...actionIconSx,
              color: "#E11D48",
              backgroundColor: "rgba(225, 29, 72, 0.06)",
              "&:hover": { backgroundColor: "rgba(225, 29, 72, 0.12)" },
            }}
          >
            <DeleteForeverRounded sx={{ fontSize: size === "small" ? "1.125rem" : "1.25rem" }} />
          </IconButton>
        </Tooltip>
      )}

      {info && data && (
        <Tooltip
          title={<ProjectDetailsTooltip data={data} />}
          placement="top"
          slotProps={detailsTooltipSlotProps}
        >
          <IconButton
            size={size}
            sx={{
              ...actionIconSx,
              color: "#0284C7",
              backgroundColor: "rgba(2, 132, 199, 0.06)",
              "&:hover": { backgroundColor: "rgba(2, 132, 199, 0.12)" },
            }}
          >
            <InfoRounded sx={{ fontSize: size === "small" ? "1.125rem" : "1.25rem" }} />
          </IconButton>
        </Tooltip>
      )}

      {toggle && (
        <Tooltip title={isActive ? "Deactivate" : "Activate"}>
          <IconButton
            size={size}
            onClick={onToggle}
            sx={{
              ...actionIconSx,
              color: isActive ? "#059669" : "#64748B",
              backgroundColor: isActive
                ? "rgba(5, 150, 105, 0.06)"
                : "rgba(100, 116, 139, 0.06)",
              "&:hover": {
                backgroundColor: isActive
                  ? "rgba(5, 150, 105, 0.12)"
                  : "rgba(100, 116, 139, 0.12)",
              },
            }}
          >
            {isActive ? (
              <ToggleOnRounded sx={{ fontSize: size === "small" ? "1.125rem" : "1.25rem" }} />
            ) : (
              <ToggleOffRounded sx={{ fontSize: size === "small" ? "1.125rem" : "1.25rem" }} />
            )}
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};

export default CrudActions;