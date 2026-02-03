import React from "react";
import { Box } from "@mui/material";
import { Outlet } from "react-router-dom";
import { createTheme } from "@mui/material/styles";
import IconButton from "@mui/material/IconButton";
import { AppBar as MuiAppBar, Toolbar as MuiToolbar } from "@mui/material";
import { MenuOutlined } from "@mui/icons-material";
import Drawer from "../common/componets/Drawer";
import { adminNavigations } from "../config/admin";
import Avatar from "../ui/Avatar";
import Menu from "../ui/Menu";

const theme = createTheme({
  typography: {
    fontFamily: "var(--font-noto-sans)",
  },
});

export default function AdminLayout() {
  const [open, setOpen] = React.useState(false);

  const AUTO_CLOSE_MS = 5000;

  React.useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      setOpen(false);
    }, AUTO_CLOSE_MS);

    return () => clearTimeout(timer); // cleanup on re-open/unmount
  }, [open]);

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
        <Box sx={{ flexGrow: 1, width: "100%" }}>
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
