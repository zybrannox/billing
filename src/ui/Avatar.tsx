import { Avatar as MuiAvatar, IconButton } from "@mui/material";
import { useUiStore } from "../store/useUiStore";
import { useAppStore } from "../store/useAppStore";
import { getInitials } from "../utils/appSupport";

const Avatar = () => {
  const { openMenu } = useUiStore();
  const { user } = useAppStore();


  return (
    <IconButton
      onClick={(e) => openMenu(e.currentTarget)}
      size="small"
      sx={{ ml: 1 }}
      aria-controls="basic-menu"
      aria-haspopup="true"
      aria-expanded={false}
    >
      <MuiAvatar
        sx={{ width: 32, height: 32 }}
        alt={user?.name}
        src="/avatar.png" // optional
      >
        {getInitials(user?.name ?? "")}
      </MuiAvatar>
    </IconButton>
  );
};

export default Avatar;
