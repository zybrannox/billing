import React from "react";
import { Box } from "@mui/material";
import { Outlet } from "react-router-dom";
import { createTheme } from "@mui/material/styles";
import IconButton from "@mui/material/IconButton";
import { AppBar as MuiAppBar, Toolbar as MuiToolbar } from "@mui/material";
import { MenuOutlined } from "@mui/icons-material";
import { adminNavigations } from "../config/admin";
import Avatar from "../ui/Avatar";
import Menu from "../ui/Menu";
import Drawer from "../common/components/Drawer";

const theme = createTheme({
  typography: {
    fontFamily: "var(--font-noto-sans)",
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
    <>
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

              <Avatar />
              <Menu />
            </MuiToolbar>
          </MuiAppBar>
          {/* Page content */}
          <Outlet />
        </Box>
      </Box>
    </>
  );
}
