"use client";

import React from "react";
import {
  styled,
  type Theme,
  type CSSObject,
  useTheme,
} from "@mui/material/styles";
import MuiDrawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import IconButton from "@mui/material/IconButton";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import { CloseOutlined } from "@mui/icons-material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Link, useLocation } from "react-router-dom";
import type { NavItem } from "../../types/adminTypes";

/**
 * Responsive Drawer
 *
 * - Desktop: permanent, collapsible mini-drawer (open/closed)
 * - Tablet & Mobile: temporary overlay drawer (slides over content)
 *
 * Props:
 *  - open: boolean (controls permanent drawer open state)
 *  - onClose: () => void (used to close temporary drawer on mobile)
 *  - onToggle?: () => void (optional toggle handler for desktop)
 */
const DRAWER_WIDTH = 260;

/* ---------------- MIXINS ---------------- */
const openedMixin = (theme: Theme): CSSObject => ({
  width: DRAWER_WIDTH,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: "hidden",
  backgroundColor: "#fff",
  color: "var(--admin-gray)",
  borderTopRightRadius: "24px",
  borderBottomRightRadius: "24px",
  border: "none",
  boxShadow: "-4px 0 12px rgba(0, 0, 0, 0.15)",
});

const closedMixin = (theme: Theme): CSSObject => ({
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: "hidden",
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up("sm")]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
  backgroundColor: "#fff",
  color: "var(--admin-gray)",
  borderTopRightRadius: "24px",
  borderBottomRightRadius: "24px",
  border: "none",
  boxShadow: "-4px 0 12px rgba(0, 0, 0, 0.15)",
});

/* ---------------- STYLED PERMANENT DRAWER ---------------- */
const CustomMuiDrawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }: { theme?: Theme; open?: boolean }) => {
  return {
    width: DRAWER_WIDTH,
    whiteSpace: "nowrap",
    boxSizing: "border-box",
    flexShrink: 0,
    boxShadow: "-4px 0 12px rgba(0, 0, 0, 0.15)",
    ...(open
      ? {
          ...openedMixin(theme as Theme),
          "& .MuiDrawer-paper": openedMixin(theme as Theme),
        }
      : {
          ...closedMixin(theme as Theme),
          "& .MuiDrawer-paper": closedMixin(theme as Theme),
        }),
  };
});

/* ---------------- HEADER ---------------- */
const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: theme.spacing(0, 2),
  ...theme.mixins.toolbar,
  height: 64,
  minHeight: 64,
  boxSizing: "border-box",
}));

// Same rounded-pill + tinted-hover treatment used everywhere else in the
// app (ui/Actions.tsx's actionIconSx, ui/Dialog.tsx's close button) -
// previously this was a bare IconButton with no hover feedback at all.
const closeButtonSx = {
  p: 0.625,
  borderRadius: "100%",
  color: "#000",
  transition: "all 0.15s ease-in-out",
  "&:active": { transform: "scale(0.95)" },
};

// Desktop and mobile showed different headers entirely (real logo images
// vs a literal "Logo" text string) - one shared renderer keeps them
// identical, which is the whole point of the mobile-color fix below.
const DrawerLogo = ({ showText }: { showText: boolean }) => (
  <div className="flex gap-1">
    <Box
      role="img"
      aria-label="App logo"
      sx={{
        width: 32,
        height: 24,
        flexShrink: 0,
        display: "flex",
        placeItems: "center",
        pointerEvents: "none", // branding is not interactive
      }}
    >
      <Box
        component="img"
        src="/images/logo.webp"
        alt=""
        sx={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
        }}
      />
    </Box>
    {showText && (
      <Box
        role="img"
        aria-label="App logo"
        sx={{
          width: 108,
          height: 24,
          flexShrink: 0,
          display: "flex",
          placeItems: "center",
          pointerEvents: "none", // branding is not interactive
        }}
      >
        <Box
          component="img"
          src="/images/logo_text.webp"
          alt=""
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
          }}
        />
      </Box>
    )}
  </div>
);

interface Props {
  open: boolean; // controls desktop permanent collapsed/expanded
  onClose: () => void; // close overlay (mobile)
  onToggle?: () => void; // toggle permanent (desktop)
  navigations: NavItem[];
}

const AUTO_CLOSE_IDLE_MS = 10000;

const Drawer: React.FC<Props> = ({ open, onClose, onToggle, navigations }) => {
  const theme = useTheme();
  const location = useLocation();
  const pathname = location.pathname;
  const isMobileOrTablet = useMediaQuery(theme.breakpoints.down("md")); // md ~ 960px

  // Desktop only: once expanded, auto-collapse after 10s of the mouse not
  // being over the drawer. Mobile/tablet is a tap-to-open overlay (no hover
  // concept there), so it only ever closes via backdrop tap, the close
  // button, or picking a nav link.
  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const clearCloseTimer = React.useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleAutoClose = React.useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(onClose, AUTO_CLOSE_IDLE_MS);
  }, [clearCloseTimer, onClose]);

  React.useEffect(() => {
    if (isMobileOrTablet) return;
    if (open) {
      scheduleAutoClose();
    } else {
      clearCloseTimer();
    }
    return clearCloseTimer;
  }, [open, isMobileOrTablet, scheduleAutoClose, clearCloseTimer]);

  const handleDrawerMouseEnter = () => {
    if (!isMobileOrTablet) clearCloseTimer();
  };

  const handleDrawerMouseLeave = () => {
    if (!isMobileOrTablet && open) scheduleAutoClose();
  };

  const renderNav = (items: NavItem[]) =>
    items.map(({ name, href, icon: Icon }: NavItem) => {
      const isActive = pathname === href;
      return (
        <ListItem
          key={name}
          disablePadding
          sx={{ display: "block", marginTop: "5px" }}
        >
          <Link
            to={href}
            onClick={() => (isMobileOrTablet ? onClose() : null)}
            className={`
              group flex py-1.5 px-4 rounded-sm transition-all duration-300 ease-out
              ${
                isMobileOrTablet
                  ? "justify-start gap-3"
                  : "justify-center gap-3"
              }
              ${isActive ? "bg-blue-50 text-blue-700" : ""}
            `}
            style={{ textDecoration: "none" }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                justifyContent: "center",
                color: isActive ? "var(--blue-800)" : "var(--blue-800)",
                ".group:hover &": { color: "var(--blue-900)" },
                ml: !isMobileOrTablet && !open ? 1.5 : "auto",
                mr: !isMobileOrTablet && open ? 1.5 : "auto",
              }}
            >
              <Icon />
            </ListItemIcon>

            <ListItemText
              primary={name}
              sx={{
                opacity: isMobileOrTablet ? 1 : open ? 1 : 0,
                transition: "opacity .2s",
                margin: 0,
                "& .MuiListItemText-primary": {
                  fontWeight: 500,
                  color: isActive ? "var(--blue-800)" : "var(--blue-800)",
                  ".group:hover &": { color: "var(--blue-900)" },
                },
              }}
            />
          </Link>
        </ListItem>
      );
    });

  /* Permanent (desktop) variant */
  if (!isMobileOrTablet) {
    return (
      <CustomMuiDrawer
        variant="permanent"
        open={open}
        onMouseEnter={handleDrawerMouseEnter}
        onMouseLeave={handleDrawerMouseLeave}
      >
        <DrawerHeader sx={{ px: 2 }}>
          <DrawerLogo showText={open} />
          <IconButton
            onClick={onToggle}
            size="small"
            sx={{
              ...closeButtonSx,
              display: open ? "inline-flex" : "none",
            }}
          >
            <CloseOutlined sx={{ fontSize: "1.2rem" }} />
          </IconButton>
        </DrawerHeader>

        <Box sx={{ px: 1.5 }}>
          <List>{renderNav(navigations)}</List>
        </Box>
      </CustomMuiDrawer>
    );
  }

  /* Temporary overlay (mobile/tablet) variant */
  return (
    <MuiDrawer
      variant="temporary"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      PaperProps={{
        sx: {
          width: DRAWER_WIDTH,
          // Matches the desktop drawer's own look (white, rounded trailing
          // corners, drop shadow) instead of the unrelated dark
          // --admin-body-bg it used before - same component, same theme,
          // regardless of viewport.
          backgroundColor: "#fff",
          color: "var(--admin-gray)",
          borderTopRightRadius: "24px",
          borderBottomRightRadius: "24px",
          boxShadow: "-4px 0 12px rgba(0, 0, 0, 0.15)",
        },
      }}
    >
      <DrawerHeader sx={{ px: 2 }}>
        <DrawerLogo showText />
        <IconButton onClick={onClose} size="small" sx={closeButtonSx}>
          <CloseOutlined sx={{ fontSize: "1.2rem" }} />
        </IconButton>
      </DrawerHeader>

      <Box sx={{ px: 1.5 }}>
        <List>{renderNav(navigations)}</List>
      </Box>
    </MuiDrawer>
  );
};

export default Drawer;
