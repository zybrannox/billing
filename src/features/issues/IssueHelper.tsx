import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, ButtonBase, IconButton, InputBase, Paper, Tooltip, Typography } from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import { apiService } from "../../api/service";
import type { MyIssues } from "../../api/types";
import { formatDateTime } from "../../format/date";
import { getApiErrorMessage } from "../../utils/apiError";
import { RobotDock, RobotPanel } from "./RobotDock";
import { isSendKey, solvedNotice } from "./issueFormat";

// A solved issue is meant to read as live without needing a websocket, same as
// the admin's notification bell.
const POLL_INTERVAL_MS = 60_000;
const MAX_LENGTH = 2000;

function RobotSays({ children, solved = false }: { children: ReactNode; solved?: boolean }) {
  return (
    <Box
      sx={{
        alignSelf: "flex-start",
        maxWidth: "88%",
        px: 1.5,
        py: 1,
        borderRadius: "14px 14px 14px 4px",
        fontSize: "var(--fs-sm)",
        lineHeight: 1.45,
        color: solved ? "var(--emerald-800)" : "var(--slate-700)",
        bgcolor: solved ? "var(--emerald-50)" : "var(--slate-100)",
      }}
    >
      {children}
    </Box>
  );
}

function YouSaid({ text, at }: { text: string; at: string }) {
  return (
    <Box sx={{ alignSelf: "flex-end", maxWidth: "88%", textAlign: "right" }}>
      <Box
        sx={{
          px: 1.5,
          py: 1,
          textAlign: "left",
          borderRadius: "14px 14px 4px 14px",
          fontSize: "var(--fs-sm)",
          lineHeight: 1.45,
          color: "var(--white)",
          bgcolor: "var(--blue-700)",
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
        }}
      >
        {text}
      </Box>
      <Typography sx={{ mt: 0.25, fontSize: "var(--fs-2xs)", color: "var(--slate-400)" }}>{formatDateTime(at)}</Typography>
    </Box>
  );
}

// Zybran, the floating helper employees tell their problems to. It isn't an AI: what they
// write goes to the admins (see AdminIssuesHelper.tsx), and it tells them once it's solved.
export default function IssueHelper() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noticeDismissedAt, setNoticeDismissedAt] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const query = useQuery({
    queryKey: ["issues", "mine"],
    queryFn: () => apiService.get<MyIssues>("/issues/mine"),
    refetchInterval: POLL_INTERVAL_MS,
  });
  const items = query.data?.items ?? [];
  const unseenCount = query.data?.unseen_count ?? 0;

  // Oldest first, like any chat. The list is newest first so its limit keeps the latest.
  const conversation = [...items].reverse();

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "end" });
  }, [open, items.length]);

  // Opening the panel is what shows them it's solved, so that's what clears the badge.
  useEffect(() => {
    if (!open || unseenCount === 0) return;
    apiService
      .post("/issues/mine/seen")
      .then(() => queryClient.invalidateQueries({ queryKey: ["issues", "mine"] }))
      .catch((err) => console.error("Couldn't mark solved issues as seen", err));
  }, [open, unseenCount, queryClient]);

  const send = async () => {
    const message = text.trim();
    if (!message || sending) return;
    setSending(true);
    setError(null);
    try {
      await apiService.post("/issues/", { text: message });
      setText("");
      await queryClient.invalidateQueries({ queryKey: ["issues", "mine"] });
    } catch (err) {
      // What they typed stays in the box to try again.
      setError(getApiErrorMessage(err, "Couldn't send that. Please try again."));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // Comes back if more get solved after dismissing it.
  const showNotice = !open && unseenCount > 0 && unseenCount !== noticeDismissedAt;

  return (
    <RobotDock label="report an issue" open={open} badge={unseenCount} onToggle={() => setOpen((value) => !value)}>
      {open && (
        <RobotPanel label="Report an issue to Zybran" subtitle="I'll pass your issue to the admins" onClose={() => setOpen(false)}>
          <Box sx={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1, p: 1.5 }}>
            <RobotSays>Hi, I'm Zybran! What's going wrong? Tell me here and I'll pass it to the admins. I'll let you know when it's solved.</RobotSays>
            {query.isError && items.length === 0 && (
              <RobotSays>I couldn't load your earlier issues, but you can still send a new one.</RobotSays>
            )}
            {conversation.map((issue) => (
              <Box key={issue.id} sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <YouSaid text={issue.text} at={issue.created_at} />
                {issue.is_done ? (
                  <RobotSays solved>
                    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, fontWeight: 700 }}>
                      <CheckCircleRoundedIcon sx={{ fontSize: 15 }} /> Solved
                    </Box>
                    {issue.done_by && ` by ${issue.done_by}`}
                    {issue.done_at && `, ${formatDateTime(issue.done_at)}`}
                  </RobotSays>
                ) : (
                  <RobotSays>The admins have this. I'll let you know when it's solved.</RobotSays>
                )}
              </Box>
            ))}
            <div ref={endRef} />
          </Box>

          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: 0, py: 0, fontSize: "var(--fs-xs)" }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: "flex", alignItems: "flex-end", gap: 0.5, p: 1, borderTop: "1px solid var(--slate-200)" }}>
            <InputBase
              inputRef={inputRef}
              multiline
              maxRows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (!isSendKey({ key: e.key, shiftKey: e.shiftKey, isComposing: e.nativeEvent.isComposing })) return;
                e.preventDefault();
                send();
              }}
              placeholder="Describe the issue..."
              inputProps={{ maxLength: MAX_LENGTH, "aria-label": "Describe the issue" }}
              sx={{ flex: 1, px: 1, py: 0.75, fontSize: "var(--fs-sm)" }}
            />
            <Tooltip title="Send">
              <span>
                <IconButton
                  aria-label="Send"
                  disabled={!text.trim() || sending}
                  onClick={send}
                  sx={{ color: "var(--blue-700)" }}
                >
                  <SendRoundedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </RobotPanel>
      )}

      {showNotice && (
        <Paper
          role="status"
          elevation={6}
          sx={{ display: "flex", alignItems: "flex-start", maxWidth: 280, borderRadius: "14px 14px 4px 14px", bgcolor: "var(--emerald-50)" }}
        >
          <ButtonBase
            onClick={() => setOpen(true)}
            sx={{
              flex: 1,
              justifyContent: "flex-start",
              textAlign: "left",
              pl: 1.5,
              py: 1,
              fontFamily: "inherit",
              fontSize: "var(--fs-sm)",
              lineHeight: 1.4,
              color: "var(--emerald-800)",
              overflowWrap: "anywhere",
            }}
          >
            {solvedNotice(items, unseenCount)}
          </ButtonBase>
          <IconButton size="small" aria-label="Dismiss" onClick={() => setNoticeDismissedAt(unseenCount)} sx={{ m: 0.25, color: "var(--emerald-800)" }}>
            <CloseRoundedIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Paper>
      )}

    </RobotDock>
  );
}
