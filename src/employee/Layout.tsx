import React from "react";
import { Box, CssBaseline } from "@mui/material";
import { Outlet } from "react-router-dom";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import IconButton from "@mui/material/IconButton";
import { AppBar as MuiAppBar, Toolbar as MuiToolbar } from "@mui/material";
import { MenuOutlined } from "@mui/icons-material";
import { employeeNavigations } from "../config/employee";
import Menu from "../ui/Menu";
import Avatar from "../ui/Avatar";
import Drawer from "../common/components/Drawer";

// Heading variants get their own fontFamily (see index.css's --font-
// heading/h1-h6 rule) - same reasoning as admin/Layout.tsx's identical
// theme override.
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

export default function EmployeeLayout() {
  const [open, setOpen] = React.useState(false);

  const handleDrawerToggle = () => setOpen((p) => !p);
  const handleDrawerClose = () => setOpen(false);

  return (
    // `theme` was previously created but never actually provided to the
    // tree - see admin/Layout.tsx's identical fix for why.
    <ThemeProvider theme={theme}>
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
                <MenuOutlined sx={{ color: "#000" }} />
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
    </ThemeProvider>
  );
}
