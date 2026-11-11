import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, IconButton, Typography } from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { useNoticeStore, type Notice, type NoticeTone } from "../store/useNoticeStore";

// How long each kind stays: long enough to read an error's reason.
const DURATION_MS: Record<NoticeTone, number> = { success: 4500, info: 5000, warning: 8000, error: 10000 };

const TONES: Record<NoticeTone, { icon: React.ReactNode; color: string; bar: string }> = {
  success: { icon: <CheckCircleRoundedIcon />, color: "var(--emerald-600)", bar: "var(--emerald-500)" },
  error: { icon: <ErrorRoundedIcon />, color: "var(--red-600)", bar: "var(--red-500)" },
  warning: { icon: <WarningAmberRoundedIcon />, color: "var(--amber-600)", bar: "var(--amber-500)" },
  info: { icon: <InfoRoundedIcon />, color: "var(--blue-600)", bar: "var(--blue-500)" },
};

// The top-right stack. Mounted once, inside the router, above every dialog.
export default function NoticeStack() {
  const notices = useNoticeStore((s) => s.notices);
  return (
    <Box
      sx={{
        position: "fixed",
        // Just under the top bar, so its search and buttons stay usable.
        top: { xs: 64, sm: 72 },
        right: { xs: 8, sm: 16 },
        left: { xs: 8, sm: "auto" },
        zIndex: 2000,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        width: { sm: 380 },
        pointerEvents: "none",
        "@media print": { display: "none" },
      }}
    >
      {notices.map((notice) => (
        <NoticeCard key={notice.id} notice={notice} />
      ))}
    </Box>
  );
}

function NoticeCard({ notice }: { notice: Notice }) {
  const dismiss = useNoticeStore((s) => s.dismiss);
  const navigate = useNavigate();
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const tone = TONES[notice.tone];

  // Closes itself, unless the pointer is resting on it; a regrouped notice
  // (version bump) starts its time again.
  useEffect(() => {
    if (paused) return;
    timer.current = setTimeout(() => dismiss(notice.id), DURATION_MS[notice.tone]);
    return () => clearTimeout(timer.current);
  }, [paused, notice.id, notice.tone, notice.version, dismiss]);

  return (
    <Box
      role={notice.tone === "error" ? "alert" : "status"}
      aria-live={notice.tone === "error" ? "assertive" : "polite"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      sx={{
        pointerEvents: "auto",
        display: "flex",
        gap: 1.25,
        alignItems: "flex-start",
        p: 1.5,
        pl: 1.75,
        bgcolor: "var(--white)",
        borderRadius: "12px",
        border: "1px solid var(--slate-200)",
        borderLeft: `4px solid ${tone.bar}`,
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.14)",
        animation: "notice-in 180ms ease-out",
        "@keyframes notice-in": { from: { opacity: 0, transform: "translateY(-6px)" }, to: { opacity: 1, transform: "none" } },
        "@media (prefers-reduced-motion: reduce)": { animation: "none" },
      }}
    >
      <Box sx={{ color: tone.color, display: "flex", mt: "1px", "& svg": { fontSize: 22 } }}>{tone.icon}</Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: "var(--fs-md)", fontWeight: 700, color: "var(--slate-900)", lineHeight: 1.35 }}>{notice.title}</Typography>
        {notice.message && (
          <Typography sx={{ fontSize: "var(--fs-sm)", color: "var(--slate-600)", lineHeight: 1.45, mt: 0.25, overflowWrap: "anywhere" }}>
            {notice.message}
          </Typography>
        )}
        {notice.action && (
          <Box
            component="button"
            type="button"
            onClick={() => {
              navigate(notice.action!.to);
              dismiss(notice.id);
            }}
            sx={{
              mt: 0.75,
              p: 0,
              border: "none",
              background: "none",
              font: "inherit",
              fontSize: "var(--fs-sm)",
              fontWeight: 700,
              color: "var(--blue-700)",
              cursor: "pointer",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            {notice.action.label}
          </Box>
        )}
      </Box>
      <IconButton size="small" aria-label="Dismiss" onClick={() => dismiss(notice.id)} sx={{ mt: -0.5, mr: -0.5, color: "var(--slate-400)" }}>
        <CloseRoundedIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}
