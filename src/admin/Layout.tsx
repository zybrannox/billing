import React from "react";
import { Box } from "@mui/material";
import { Outlet } from "react-router-dom";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import IconButton from "@mui/material/IconButton";
import { AppBar as MuiAppBar, Toolbar as MuiToolbar } from "@mui/material";
import { MenuOutlined } from "@mui/icons-material";
import { adminNavigations } from "../config/admin";
import Avatar from "../ui/Avatar";
import Menu from "../ui/Menu";
import Drawer from "../common/components/Drawer";
import NotificationBell from "./components/NotificationBell";

// Heading variants get their own fontFamily (see index.css's --font-
// heading/h1-h6 rule) - a plain global `h1{...}` selector in index.css
// can't reliably win against MUI's own emotion-generated styles, so the
// theme itself is the only place this is guaranteed to apply to every
// Typography variant="h1".."h6" in the admin app, regardless of which
// element it actually renders as.
const theme = createTheme({
  typography: {
    fontFamily: "var(--font-noto-sans)",
    h1: { fontFamily: "var(--font-heading)" },
    h2: { fontFamily: "var(--font-heading)" },
    h3: { fontFamily: "var(--font-heading)" },
    h4: { fontFamily: "var(--font-heading)" },
    h5: { fontFamily: "var(--font-heading)" },
    h6: { fontFamily: "var(--font-heading)" },
  },
});

export default function AdminLayout() {
  const [open, setOpen] = React.useState(false);

  // No auto-close timer: on mobile the drawer is a temporary overlay that
  // must stay open until the user picks a link or taps the backdrop/close
  // button - auto-closing it after a few seconds mid-decision is a trap.

  const handleDrawerToggle = () => setOpen((p) => !p);
  const handleDrawerClose = () => setOpen(false);

  return (
    // `theme` was previously created but never actually provided to the
    // tree - every MUI component (Typography, Button, TextField, dialogs,
    // DataGrid...) has been silently using MUI's own built-in default
    // theme this whole time, including its default Roboto/Helvetica/Arial
    // font stack, regardless of what this file configured. This is the
    // fix that makes the configured typography (Inter body, Plus Jakarta
    // Sans headings - see the theme above) actually take effect.
    <ThemeProvider theme={theme}>
      <Box sx={{ display: "flex" }}>
        {/* Drawer: component decides permanent vs temporary based on breakpoints */}
        <Drawer
          open={open}
          onClose={handleDrawerClose}
          onToggle={handleDrawerToggle}
          navigations={adminNavigations}
        />
        {/* Main area */}
        {/* minWidth: 0 is required so this flex item actually shrinks when
            the drawer expands, instead of being held to its content's
            intrinsic width (the classic flexbox min-width:auto trap). */}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          {/* Topbar */}
          <MuiAppBar
            position="relative"
            sx={{
              background: "transparent",
              boxShadow: "none",
              zIndex: !open ? theme.zIndex.drawer + 1 : theme.zIndex.appBar,
            }}
          >
            <MuiToolbar sx={{ justifyContent: "space-between" }}>
              <IconButton color="inherit" onClick={handleDrawerToggle}>
                <MenuOutlined sx={{ color: "#000" }} />
              </IconButton>

              <Box sx={{ display: "flex", alignItems: "center" }}>
                <NotificationBell />
                <Avatar />
                <Menu />
              </Box>
            </MuiToolbar>
          </MuiAppBar>
          {/* Page content */}
          <Outlet />
        </Box>
      </Box>
    </ThemeProvider>
  );
}
