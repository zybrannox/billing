import { useState, type ElementType, type ReactNode } from "react";
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from "@mui/material";
import { MoreVertRounded } from "@mui/icons-material";
import { iconFontSize, type ActionSize } from "./actionTints";

export interface MenuAction {
  key: string;
  label: string;
  icon: ElementType;
  iconColor: string;
  onClick?: () => void;
  disabled?: boolean;
  // Explains why it's disabled, or adds detail on hover.
  hint?: ReactNode;
  hintSlotProps?: React.ComponentProps<typeof Tooltip>["slotProps"];
  destructive?: boolean;
}

const labelProps = { fontSize: "var(--fs-sm)", fontWeight: 500 };

// A row's less common actions, behind one button.
export default function MoreActionsMenu({ size, actions }: { size: ActionSize; actions: MenuAction[] }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);

  return (
    <>
      <Tooltip title="More actions">
        <IconButton
          size={size}
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{
            p: size === "small" ? 0.625 : 0.75,
            borderRadius: "8px",
            transition: "all 0.15s ease-in-out",
            "&:active": { transform: "scale(0.95)" },
            color: "var(--slate-500)",
            backgroundColor: "rgba(100, 116, 139, 0.06)",
            border: "1px solid rgba(100, 116, 139, 0.15)",
            "&:hover": { backgroundColor: "rgba(100, 116, 139, 0.12)", color: "var(--slate-700)" },
          }}
        >
          <MoreVertRounded sx={{ fontSize: iconFontSize(size) }} />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={close}
        slotProps={{
          paper: {
            elevation: 2,
            sx: {
              mt: 0.75,
              minWidth: 160,
              borderRadius: "10px",
              border: "1px solid var(--slate-200)",
              boxShadow: "0px 8px 20px -4px rgba(15, 23, 42, 0.08)",
            },
          },
        }}
      >
        {actions.map((action) => {
          const Icon = action.icon;
          const item = (
            <MenuItem
              key={action.key}
              disabled={action.disabled}
              onClick={() => {
                close();
                action.onClick?.();
              }}
              sx={{ py: 0.875, ...(action.destructive ? { color: "var(--rose-600)" } : {}) }}
            >
              <ListItemIcon>
                <Icon fontSize="small" sx={{ color: action.iconColor }} />
              </ListItemIcon>
              <ListItemText primaryTypographyProps={labelProps}>{action.label}</ListItemText>
            </MenuItem>
          );
          if (!action.hint) return item;
          return (
            <Tooltip key={action.key} title={action.hint} placement="left" slotProps={action.hintSlotProps}>
              {action.disabled ? <span>{item}</span> : item}
            </Tooltip>
          );
        })}
      </Menu>
    </>
  );
}
