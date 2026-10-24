import React from "react";
import { useTheme } from "@mui/material/styles";
import { Box, CssBaseline } from "@mui/material";
import { Outlet } from "react-router-dom";
import IconButton from "@mui/material/IconButton";
import { AppBar as MuiAppBar, Toolbar as MuiToolbar } from "@mui/material";
import { MenuOutlined } from "@mui/icons-material";
import { employeeNavigations } from "./navigation";
import Menu from "../ui/Menu";
import Avatar from "../ui/Avatar";
import Drawer from "../ui/Drawer";
import { Suspense } from "react";
import PageSpinner from "../ui/PageSpinner";


export default function EmployeeLayout() {
  const theme = useTheme();
  const [open, setOpen] = React.useState(false);

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
        {/* minWidth: 0 lets this flex item actually shrink when the drawer
            expands, instead of being held to its content's intrinsic width. */}
        <Box component="main" sx={{ flexGrow: 1, minWidth: 0, minHeight: "100vh" }}>
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
                <MenuOutlined sx={{ color: "var(--black)" }} />
              </IconButton>
              <div>
                <Avatar />
                <Menu />
              </div>
            </MuiToolbar>
          </MuiAppBar>
          {/* Page content */}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              minWidth: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "var(--white)",
              transition: theme.transitions.create("margin", {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            }}
          >
            <Suspense fallback={<PageSpinner />}>
            <Outlet />
          </Suspense>
          </Box>
        </Box>
      </Box>
    </>
  );
}
