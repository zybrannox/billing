import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, ButtonBase, IconButton, InputBase, Typography } from "@mui/material";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import { apiService } from "../../api/service";
import type { MyIssues } from "../../api/types";
import { formatDateTime } from "../../format/date";
import { getApiErrorMessage } from "../../utils/apiError";
import Robot from "./Robot";
import { RobotDock, RobotPanel } from "./RobotDock";
import { isSendKey, issueNotice } from "./issueFormat";

// An answered issue is meant to read as live without needing a websocket, same as
// the admin's notification bell.
const POLL_INTERVAL_MS = 60_000;
const MAX_LENGTH = 2000;

function Greeting({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1, maxWidth: "92%" }}>
      <Box sx={{ flexShrink: 0, mb: 0.25 }}>
        <Robot size={24} still />
      </Box>
      <Box
        sx={{
          px: 1.5,
          py: 1,
          borderRadius: "12px 12px 12px 4px",
          fontSize: "var(--fs-sm)",
          lineHeight: 1.5,
          color: "var(--slate-700)",
          bgcolor: "var(--white)",
          border: "1px solid var(--slate-200)",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function IssueStatus({ issue }: { issue: MyIssues["items"][number] }) {
  if (issue.is_cancelled) {
    return (
      <Typography sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--slate-500)" }}>
        <CancelRoundedIcon sx={{ fontSize: 14 }} />
        Cancelled{issue.cancelled_by && ` by ${issue.cancelled_by}`}
      </Typography>
    );
  }
  if (issue.is_done) {
    return (
      <Typography sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--emerald-700)" }}>
        <CheckCircleRoundedIcon sx={{ fontSize: 14 }} />
        Solved{issue.done_by && ` by ${issue.done_by}`}
      </Typography>
    );
  }
  return (
    <Typography sx={{ display: "inline-flex", alignItems: "center", gap: 0.625, fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--amber-700)" }}>
      <Box component="span" sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "var(--amber-500)" }} />
      Waiting for admin
    </Typography>
  );
}

function IssueMessage({ issue }: { issue: MyIssues["items"][number] }) {
  return (
    <Box sx={{ alignSelf: "flex-end", maxWidth: "88%", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.5 }}>
      <Box
        sx={{
          px: 1.5,
          py: 1,
          borderRadius: "12px 12px 4px 12px",
          fontSize: "var(--fs-sm)",
          lineHeight: 1.5,
          color: "var(--white)",
          bgcolor: "var(--blue-600)",
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
        }}
      >
        {issue.text}
      </Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center", columnGap: 0.75 }}>
        <IssueStatus issue={issue} />
        <Typography sx={{ fontSize: "var(--fs-xs)", color: "var(--slate-400)" }}>
          · {formatDateTime(issue.done_at ?? issue.cancelled_at ?? issue.created_at)}
        </Typography>
      </Box>
    </Box>
  );
}

// Zybran, the floating helper employees tell their problems to. It isn't an AI: what they
// write goes to the admins (see AdminIssuesHelper.tsx), and it tells them once it's solved or cancelled.
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

  // Opening the panel is what shows them the answer, so that's what clears the badge.
  useEffect(() => {
    if (!open || unseenCount === 0) return;
    apiService
      .post("/issues/mine/seen")
      .then(() => queryClient.invalidateQueries({ queryKey: ["issues", "mine"] }))
      .catch((err) => console.error("Couldn't mark answered issues as seen", err));
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
          <Box sx={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1.75, p: 2, bgcolor: "var(--slate-50)" }}>
            <Greeting>Hi, I'm Zybran. Tell me what's going wrong and I'll pass it to the admins. I'll let you know here when it's solved.</Greeting>
            {query.isError && items.length === 0 && (
              <Greeting>I couldn't load your earlier issues, but you can still send a new one.</Greeting>
            )}
            {conversation.map((issue) => (
              <IssueMessage key={issue.id} issue={issue} />
            ))}
            <div ref={endRef} />
          </Box>

          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: 0, py: 0, fontSize: "var(--fs-xs)" }}>
              {error}
            </Alert>
          )}

          <Box sx={{ p: 1.5, borderTop: "1px solid var(--slate-200)" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-end",
                gap: 0.5,
                p: 0.5,
                pl: 1.25,
                border: "1px solid var(--slate-300)",
                borderRadius: "10px",
                transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                "&:focus-within": { borderColor: "var(--blue-500)", boxShadow: "var(--shadow-ring)" },
              }}
            >
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
                sx={{ flex: 1, py: 0.5, fontSize: "var(--fs-sm)" }}
              />
              <IconButton
                aria-label="Send"
                size="small"
                disabled={!text.trim() || sending}
                onClick={send}
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "8px",
                  color: "var(--white)",
                  bgcolor: "var(--blue-600)",
                  "&:hover": { bgcolor: "var(--blue-700)" },
                  "&.Mui-disabled": { color: "var(--slate-400)", bgcolor: "var(--slate-100)" },
                }}
              >
                <SendRoundedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
            <Typography sx={{ display: { xs: "none", md: "block" }, mt: 0.75, fontSize: "var(--fs-2xs)", color: "var(--slate-400)" }}>
              Enter to send · Shift + Enter for a new line
            </Typography>
          </Box>
        </RobotPanel>
      )}

      {showNotice && (
        <Box
          role="status"
          sx={{
            display: "flex",
            alignItems: "flex-start",
            maxWidth: 300,
            bgcolor: "var(--white)",
            border: "1px solid var(--slate-200)",
            borderRadius: "12px",
            boxShadow: "0 12px 28px -10px rgba(15, 23, 42, 0.22)",
          }}
        >
          <ButtonBase
            onClick={() => setOpen(true)}
            sx={{
              flex: 1,
              alignItems: "flex-start",
              justifyContent: "flex-start",
              gap: 1,
              textAlign: "left",
              pl: 1.5,
              py: 1.25,
              borderRadius: "12px",
              fontFamily: "inherit",
              fontSize: "var(--fs-sm)",
              lineHeight: 1.45,
              color: "var(--slate-700)",
              overflowWrap: "anywhere",
            }}
          >
            <CheckCircleRoundedIcon sx={{ fontSize: 18, mt: 0.125, color: "var(--blue-600)" }} />
            {issueNotice(items, unseenCount)}
          </ButtonBase>
          <IconButton size="small" aria-label="Dismiss" onClick={() => setNoticeDismissedAt(unseenCount)} sx={{ m: 0.5, color: "var(--slate-400)" }}>
            <CloseRoundedIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      )}
    </RobotDock>
  );
}
