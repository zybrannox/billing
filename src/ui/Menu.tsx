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

const Menu = () => {
  const { menuAnchorEl, closeMenu } = useUiStore();
  const { user, clearUser } = useAppStore();
  const navigate = useNavigate();

  const open = Boolean(menuAnchorEl);

  const handleLogout = () => {
    // 1. Clear user from Zustand store
    clearUser();
    // 2. Close the menu
    closeMenu();
    // 3. Redirect to login page
    navigate("/login");
  };
  console.log(user);

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
          mt: 1.5,
          minWidth: 220,
          borderRadius: 2,
          overflow: "visible",
          boxShadow:
            "0px 2px 8px rgba(0, 0, 0, 0.06), " +
            "0px 8px 24px rgba(0, 0, 0, 0.08)",
          backgroundColor: "#fff",

          /* V-notch */
          "&::before": {
            content: '""',
            position: "absolute",
            top: -6,
            right: 20,
            width: 10,
            height: 10,
            boxShadow: "-2px -2px 6px rgba(0, 0, 0, 0.04)",
            bgcolor: "inherit",
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
        py={2}
        display="flex"
        flexDirection="column"
        alignItems="center"
        textAlign="center"
      >
        <Typography
          variant="subtitle2"
          color="var(--blue-800)"
          fontWeight={600}
          noWrap
        >
          {`Welcome, ${user?.username}`}
        </Typography>

        <Typography variant="caption" color="var(--blue-600)" noWrap>
          {user?.role === "user" ? "To Our Operations Portal" : "Administrator"}
        </Typography>
      </Box>

      <Divider sx={{ borderColor: "var(--border-color)" }} />

      {/* Actions */}

      <MenuItem
        onClick={handleLogout}
        sx={{
          color: "var(--blue-800)",
          transition: "color 0.2s ease",

          "&:hover": {
            color: "var(--blue-900)",
            backgroundColor: "var(--blue-50)",

            "& .MuiListItemIcon-root": {
              color: "var(--blue-900)",
            },
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 32,
            color: "inherit",
            transition: "color 0.2s ease",
          }}
        >
          <LogoutOutlined fontSize="small" />
        </ListItemIcon>
        Logout
      </MenuItem>
    </MuiMenu>
  );
};

export default Menu;
