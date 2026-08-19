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

const Menu = React.memo(() => {
  const { menuAnchorEl, closeMenu } = useUiStore();
  const { user, clearUser } = useAppStore();
  const navigate = useNavigate();

  const open = Boolean(menuAnchorEl);

  const handleLogout = () => {
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
          border: "1px solid #E2E8F0",
          boxShadow: "0px 4px 16px rgba(15, 23, 42, 0.08)",
          backgroundColor: "#FFFFFF",

          /* V-notch */
          "&::before": {
            content: '""',
            position: "absolute",
            top: -6,
            right: 18,
            width: 10,
            height: 10,
            borderLeft: "1px solid #E2E8F0",
            borderTop: "1px solid #E2E8F0",
            bgcolor: "#FFFFFF",
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
            color: "#0F172A",
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
            color: "#64748B",
            fontSize: "0.75rem",
            mt: 0.25,
          }}
          noWrap
        >
          {user?.role === "user" ? "Operations Portal" : "Administrator"}
        </Typography>
      </Box>

      <Divider sx={{ borderColor: "#F1F5F9" }} />

      {/* Actions */}
      <MenuItem
        onClick={handleLogout}
        sx={{
          mx: 0.5,
          my: 0.5,
          px: 1.5,
          py: 1,
          borderRadius: "6px",
          color: "#475569",
          fontSize: "0.85rem",
          fontWeight: 500,
          transition: "all 0.15s ease-in-out",

          "&:hover": {
            color: "#EF4444",
            backgroundColor: "rgba(239, 68, 68, 0.06)",

            "& .MuiListItemIcon-root": {
              color: "#EF4444",
            },
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 28,
            color: "#64748B",
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