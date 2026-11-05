import { Box } from "@mui/material";
import { getInitials } from "../utils/appSupport";

// A person's initials in a soft tinted square, for lists and profile headers.
export default function InitialsAvatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        display: "grid",
        placeItems: "center",
        borderRadius: `${Math.round(size * 0.28)}px`,
        bgcolor: "var(--blue-50)",
        color: "var(--blue-700)",
        fontWeight: 700,
        fontSize: size * 0.4,
        lineHeight: 1,
        textTransform: "uppercase",
      }}
    >
      {getInitials(name)}
    </Box>
  );
}
