import { useEffect, type ReactNode } from "react";
import { Badge, Box, ButtonBase, IconButton, Tooltip, Typography } from "@mui/material";
import { keyframes } from "@mui/material/styles";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import Robot from "./Robot";

const GUTTER = { xs: 16, sm: 24 };

const rise = keyframes`
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to { opacity: 1; transform: none; }
`;

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
        gap: 1.25,
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

// The card that opens from the robot.
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
    <Box
      role="dialog"
      aria-label={label}
      sx={{
        width: { xs: "calc(100vw - 32px)", sm: wide ? 440 : 380 },
        height: { xs: "min(72vh, 520px)", sm: wide ? "min(75vh, 580px)" : "min(72vh, 540px)" },
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        bgcolor: "var(--white)",
        border: "1px solid var(--slate-200)",
        borderRadius: "14px",
        boxShadow: "0 16px 40px -12px rgba(15, 23, 42, 0.22), 0 2px 6px rgba(15, 23, 42, 0.05)",
        transformOrigin: "bottom right",
        animation: `${rise} 0.16s ease-out`,
        "@media (prefers-reduced-motion: reduce)": { animation: "none" },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 2, py: 1.5, borderBottom: "1px solid var(--slate-200)" }}>
        <Box
          sx={{
            width: 38,
            height: 38,
            flexShrink: 0,
            display: "grid",
            placeItems: "center",
            borderRadius: "10px",
            bgcolor: "var(--blue-50)",
          }}
        >
          <Robot size={27} still />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "var(--fs-lg)", lineHeight: 1.25, color: "var(--slate-900)" }}>Zybran</Typography>
          <Typography noWrap sx={{ fontSize: "var(--fs-xs)", color: "var(--slate-500)" }}>{subtitle}</Typography>
        </Box>
        <IconButton size="small" aria-label="Close" onClick={onClose} sx={{ color: "var(--slate-500)", "&:hover": { color: "var(--slate-900)" } }}>
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Box>
      {children}
    </Box>
  );
}
