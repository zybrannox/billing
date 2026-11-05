import { Box } from "@mui/material";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";

const linkSx = {
  display: "inline-flex",
  alignItems: "center",
  gap: 0.5,
  minWidth: 0,
  color: "var(--slate-600)",
  fontSize: "var(--fs-sm)",
  textDecoration: "none",
  overflowWrap: "anywhere",
  "&:hover": { color: "var(--blue-700)" },
  "& svg": { fontSize: 15, color: "var(--slate-400)" },
};

// A person's phone and email, each one click from calling or writing.
export default function ContactLinks({ phone, email }: { phone?: string | null; email?: string | null }) {
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 1.5, rowGap: 0.25, mt: 0.25 }}>
      {phone && (
        <Box component="a" href={`tel:${phone}`} sx={linkSx}>
          <PhoneRoundedIcon />
          {phone}
        </Box>
      )}
      {email && (
        <Box component="a" href={`mailto:${email}`} sx={linkSx}>
          <EmailRoundedIcon />
          {email}
        </Box>
      )}
    </Box>
  );
}
