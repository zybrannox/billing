import type { ElementType, ReactNode } from "react";
import { IconButton, Tooltip } from "@mui/material";
import { iconFontSize, DONE_TINT, WAITING_TINT, type ActionSize, type ActionTint } from "./actionTints";

const shapeSx = (size: ActionSize) => ({
  p: size === "small" ? 0.625 : 0.75,
  borderRadius: "8px",
  transition: "all 0.15s ease-in-out",
  "&:active": { transform: "scale(0.95)" },
});

// One round-cornered action. `disabled` being set at all (even false) wraps the
// button in a span, since a disabled button can't show its own tooltip.
export default function ActionButton({
  title,
  icon: Icon,
  tint,
  size,
  onClick,
  disabled,
  disabledOpacity = 0.4,
}: {
  title: ReactNode;
  icon: ElementType;
  tint: ActionTint;
  size: ActionSize;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  disabled?: boolean;
  disabledOpacity?: number;
}) {
  const button = (
    <IconButton
      size={size}
      onClick={onClick}
      disabled={disabled}
      sx={{
        ...shapeSx(size),
        color: tint.color,
        backgroundColor: tint.bg,
        ...(tint.border ? { border: `1px solid ${tint.border}` } : {}),
        "&:hover": { backgroundColor: tint.hover },
        "&.Mui-disabled": { opacity: disabledOpacity },
      }}
    >
      <Icon sx={{ fontSize: iconFontSize(size) }} />
    </IconButton>
  );
  return <Tooltip title={title}>{disabled === undefined ? button : <span>{button}</span>}</Tooltip>;
}

// A step in an order's life: green once done, tinted when it can be done now,
// grey while it's waiting on an earlier step.
export function MilestoneButton({
  title,
  icon,
  doneIcon,
  tint,
  done,
  ready,
  size,
  onClick,
}: {
  title: string;
  icon: ElementType;
  doneIcon: ElementType;
  tint: ActionTint;
  done: boolean;
  ready: boolean;
  size: ActionSize;
  onClick?: () => void;
}) {
  return (
    <ActionButton
      title={title}
      icon={done ? doneIcon : icon}
      tint={done ? DONE_TINT : ready ? tint : WAITING_TINT}
      size={size}
      onClick={onClick}
      disabled={done || !ready}
      disabledOpacity={done ? 0.95 : 0.45}
    />
  );
}
