import React from "react";
import {
  Menu as MuiMenu,
  MenuItem,
  Box,
  Typography,
  Divider,
  ListItemIcon,
} from "@mui/material";
import { useUiStore } from "../store/useUiStore";
import { useAppStore } from "../store/useAppStore";
import { useNavigate } from "react-router-dom";
import { LogoutOutlined } from "@mui/icons-material";
import { apiService } from "../api/service";

const Menu = React.memo(() => {
  const { menuAnchorEl, closeMenu } = useUiStore();
  const { user, clearUser } = useAppStore();
  const navigate = useNavigate();

  const open = Boolean(menuAnchorEl);

  const handleLogout = async () => {
    // The access token is an httpOnly cookie - JS can't clear it directly,
    // so without this call it stays valid and the "logged out" user (or
    // anyone else on the same browser) is still authenticated server-side
    // until it naturally expires, no matter what local state says.
    try {
      await apiService.post("/auth/logout");
    } catch (err) {
      console.error("Logout request failed", err);
    }
    clearUser();
    closeMenu();
    navigate("/login");
  };

  return (
    <MuiMenu
      id="account-menu"
      anchorEl={menuAnchorEl}
      open={open}
      onClose={closeMenu}
      onClick={closeMenu}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "right",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "right",
      }}
      PaperProps={{
        elevation: 0,
        sx: {
          mt: 1,
          minWidth: 220,
          borderRadius: "10px",
          overflow: "visible",
          border: "1px solid var(--slate-200)",
          boxShadow: "0px 4px 16px rgba(15, 23, 42, 0.08)",
          backgroundColor: "var(--white)",

          /* V-notch */
          "&::before": {
            content: '""',
            position: "absolute",
            top: -6,
            right: 18,
            width: 10,
            height: 10,
            borderLeft: "1px solid var(--slate-200)",
            borderTop: "1px solid var(--slate-200)",
            bgcolor: "var(--white)",
            transform: "rotate(45deg)",
            zIndex: 0,
          },
        },
      }}
      MenuListProps={{
        sx: {
          py: 0.5,
        },
      }}
    >
      {/* Header */}
      <Box
        px={2}
        py={1.75}
        display="flex"
        flexDirection="column"
        alignItems="center"
        textAlign="center"
      >
        <Typography
          variant="subtitle2"
          sx={{
            color: "var(--slate-900)",
            fontWeight: 600,
            fontSize: "0.875rem",
          }}
          noWrap
        >
          {`Welcome, ${user?.username || "User"}`}
        </Typography>

        <Typography
          variant="caption"
          sx={{
            color: "var(--slate-500)",
            fontSize: "0.75rem",
            mt: 0.25,
          }}
          noWrap
        >
          {user?.role === "user" ? "Operations Portal" : "Administrator"}
        </Typography>
      </Box>

      <Divider sx={{ borderColor: "var(--slate-100)" }} />

      {/* Actions */}
      <MenuItem
        onClick={handleLogout}
        sx={{
          mx: 0.5,
          my: 0.5,
          px: 1.5,
          py: 1,
          borderRadius: "6px",
          color: "var(--slate-600)",
          fontSize: "0.85rem",
          fontWeight: 500,
          transition: "all 0.15s ease-in-out",

          "&:hover": {
            color: "var(--red-500)",
            backgroundColor: "rgba(239, 68, 68, 0.06)",

            "& .MuiListItemIcon-root": {
              color: "var(--red-500)",
            },
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 28,
            color: "var(--slate-500)",
            transition: "color 0.15s ease-in-out",
          }}
        >
          <LogoutOutlined sx={{ fontSize: 18 }} />
        </ListItemIcon>
        Logout
      </MenuItem>
    </MuiMenu>
  );
});

Menu.displayName = "Menu";

export default Menu;