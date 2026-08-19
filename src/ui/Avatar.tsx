import React from "react";
import { Avatar as MuiAvatar, IconButton } from "@mui/material";
import { useUiStore } from "../store/useUiStore";
import { useAppStore } from "../store/useAppStore";
import { getInitials } from "../utils/appSupport";

interface AvatarProps {
  size?: number;
  className?: string;
}

const Avatar = React.memo(({ size = 32, className }: AvatarProps) => {
  const { openMenu, menuAnchorEl } = useUiStore();
  const { user } = useAppStore();

  const isOpen = Boolean(menuAnchorEl);
  const displayName = user?.username || "User";

  return (
    <IconButton
      onClick={(e) => openMenu(e.currentTarget)}
      size="small"
      className={className}
      aria-label={`Account menu for ${displayName}`}
      aria-controls={isOpen ? "account-menu" : undefined}
      aria-haspopup="true"
      aria-expanded={isOpen}
      sx={{
        p: 0.5,
        transition: "transform 0.15s ease-in-out",
        "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" },
      }}
    >
      <MuiAvatar
        alt={displayName}
        sx={{
          width: size,
          height: size,
          fontSize: `${size * 0.42}px`,
          fontWeight: 600,
          background: "var(--blue-gradient)",
          color: "#FFFFFF",
        }}
      >
        {getInitials(displayName)}
      </MuiAvatar>
    </IconButton>
  );
});

Avatar.displayName = "Avatar";

export default Avatar;