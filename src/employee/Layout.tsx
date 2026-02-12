import React from "react";
import { Box, CssBaseline } from "@mui/material";
import { Outlet } from "react-router-dom";
import { createTheme } from "@mui/material/styles";
import IconButton from "@mui/material/IconButton";
import { AppBar as MuiAppBar, Toolbar as MuiToolbar } from "@mui/material";
import { MenuOutlined } from "@mui/icons-material";
import { employeeNavigations } from "../config/employee";
// import Menu from "../ui/Menu";
// import Avatar from "../ui/Avatar";
import NotificationsIcon from "@mui/icons-material/Notifications";
import Badge from "@mui/material/Badge";
import Menu from "../ui/Menu";
import Avatar from "../ui/Avatar";
import Drawer from "../common/components/Drawer";

const theme = createTheme({
  typography: {
    fontFamily: "var(--font-noto-sans)",
  },
});

export default function EmployeeLayout() {
  const [open, setOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState(null);
  const opens = Boolean(anchorEl);

  const handleOpens = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };
  const AUTO_CLOSE_MS = 5000;

  // React.useEffect(() => {
  //   if (!open) return;

  //   const timer = setTimeout(() => {
  //     setOpen(false);
  //   }, AUTO_CLOSE_MS);

  //   return () => clearTimeout(timer); // cleanup on re-open/unmount
  // }, [open]);

  const handleDrawerToggle = () => setOpen((p) => !p);
  const handleDrawerClose = () => setOpen(false);

  return (
    <>
      <CssBaseline />
      <Box sx={{ display: "flex" }}>
        {/* Drawer: component decides permanent vs temporary based on breakpoints */}
        <Drawer
          navigations={employeeNavigations}
          open={open}
          onClose={handleDrawerClose}
          onToggle={handleDrawerToggle}
        />
        {/* Main area */}
        <Box component="main" sx={{ flexGrow: 1, minHeight: "100vh" }}>
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
              <IconButton onClick={handleDrawerToggle}>
                <MenuOutlined sx={{ color: "#000" }} />
              </IconButton>
              <div>
                <IconButton
                  size="large"
                  aria-label="show 17 new notifications"
                  color="inherit"
                >
                  <Badge badgeContent={17} color="error">
                    <NotificationsIcon sx={{ color: "#000" }} />
                  </Badge>
                </IconButton>
                {/* <Avatar /> */}
                <IconButton onClick={handleOpens}>
                  <Avatar />
                </IconButton>
                <Menu />
              </div>
            </MuiToolbar>
          </MuiAppBar>
          {/* Page content */}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              width: "100%",
              height: "100%",
              backgroundColor: "#fff",
              transition: theme.transitions.create("margin", {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            }}
          >
            <Outlet />
          </Box>
        </Box>
      </Box>
    </>
  );
}
