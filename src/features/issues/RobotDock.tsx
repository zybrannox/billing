import { useEffect, type ReactNode } from "react";
import { Badge, Box, ButtonBase, IconButton, Paper, Tooltip, Typography } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import Robot from "./Robot";

const GUTTER = { xs: 16, sm: 24 };

// Zybran floating at the bottom right, with whatever it's showing stacked above it.
export function RobotDock({
  label,
  open,
  badge,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  badge: number;
  onToggle: () => void;
  children?: ReactNode;
}) {
  return (
    <Box
      sx={{
        position: "fixed",
        right: GUTTER,
        bottom: GUTTER,
        // Above the page, below any dialog.
        zIndex: (theme) => theme.zIndex.speedDial,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 1,
        pointerEvents: "none",
        "& > *": { pointerEvents: "auto" },
        "@media print": { display: "none" },
      }}
    >
      {children}
      <Tooltip title={open ? "" : `Zybran: ${label}`} placement="left">
        <ButtonBase
          aria-label={badge > 0 ? `Zybran: ${label}. ${badge} new.` : `Zybran: ${label}`}
          aria-expanded={open}
          onClick={onToggle}
          sx={{ borderRadius: "50%", p: 0.5, "&:focus-visible": { outline: "2px solid var(--blue-500)" } }}
        >
          <Badge badgeContent={badge} color="error" overlap="circular" sx={{ "& .MuiBadge-badge": { fontWeight: 700 } }}>
            <Robot size={68} />
          </Badge>
        </ButtonBase>
      </Tooltip>
    </Box>
  );
}

// The panel that opens from the robot.
export function RobotPanel({
  label,
  subtitle,
  wide = false,
  onClose,
  children,
}: {
  label: string;
  subtitle: string;
  wide?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  // On the whole page, not the panel: clicking a button that then disappears, like
  // Mark as done, leaves the keyboard focus outside it. A dialog on top keeps its Esc.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector(".MuiModal-root")) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <Paper
      role="dialog"
      aria-label={label}
      elevation={8}
      sx={{
        width: { xs: "calc(100vw - 32px)", sm: wide ? 440 : 360 },
        height: { xs: "min(70vh, 480px)", sm: wide ? "min(75vh, 580px)" : "min(70vh, 500px)" },
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: "16px",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 1.5, py: 1, bgcolor: "var(--blue-900)", color: "var(--white)" }}>
        <Box sx={{ flexShrink: 0, mt: 0.5 }}>
          <Robot size={34} still />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "var(--fs-md)", lineHeight: 1.2 }}>Zybran</Typography>
          <Typography sx={{ fontSize: "var(--fs-xs)", opacity: 0.8 }}>{subtitle}</Typography>
        </Box>
        <IconButton size="small" aria-label="Close" onClick={onClose} sx={{ color: "var(--white)" }}>
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Box>
      {children}
    </Paper>
  );
}
