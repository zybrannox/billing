import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Button as MuiButton, Typography } from "@mui/material";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import InboxRoundedIcon from "@mui/icons-material/InboxRounded";
import { apiService } from "../../api/service";
import { useConfirmDialogStore } from "../../hooks/useconfirmDialogStore";
import type { Issue, IssueList } from "../../api/types";
import { formatDateTime } from "../../format/date";
import EmptyState from "../../ui/EmptyState";
import FilterPill from "../../ui/FilterPill";
import InitialsAvatar from "../../ui/InitialsAvatar";
import ListPager from "../../ui/ListPager";
import ListState from "../../ui/ListState";
import { getApiErrorMessage } from "../../utils/apiError";
import { RobotDock, RobotPanel } from "./RobotDock";

// Same pace as the admin's notification bell.
const POLL_INTERVAL_MS = 60_000;
const PAGE_SIZE = 20;

type Filter = "open" | "done" | "cancelled" | "all";

const EMPTY: Record<Filter, { icon: React.ReactNode; title: string; description: string }> = {
  open: { icon: <CheckCircleRoundedIcon />, title: "You're all caught up", description: "No issues are waiting on you." },
  done: { icon: <InboxRoundedIcon />, title: "Nothing solved yet", description: "Issues you mark as done appear here." },
  cancelled: { icon: <InboxRoundedIcon />, title: "Nothing cancelled", description: "Issues you cancel appear here." },
  all: { icon: <InboxRoundedIcon />, title: "No issues yet", description: "Anything employees report appears here." },
};

const waitingLabel = (count: number | undefined) => {
  if (count === undefined) return "Issues your employees have reported";
  if (count === 0) return "No issues waiting";
  return `${count} ${count === 1 ? "issue" : "issues"} waiting`;
};

type IssueStatusValue = "open" | "done" | "cancelled";

function Answer({ issue, busy, onReopen }: { issue: Issue; busy: boolean; onReopen: () => void }) {
  const Icon = issue.is_cancelled ? CancelRoundedIcon : CheckCircleRoundedIcon;
  return (
    <Box sx={{ mt: 0.75, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
      <Typography
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          minWidth: 0,
          fontSize: "var(--fs-xs)",
          color: issue.is_cancelled ? "var(--slate-500)" : "var(--emerald-700)",
        }}
      >
        <Icon sx={{ fontSize: 14 }} />
        {issue.is_cancelled
          ? `Cancelled by ${issue.cancelled_by ?? "an admin"}, ${formatDateTime(issue.cancelled_at)}`
          : `Solved by ${issue.done_by ?? "an admin"}, ${formatDateTime(issue.done_at)}`}
      </Typography>
      <MuiButton
        size="small"
        disabled={busy}
        onClick={onReopen}
        sx={{ flexShrink: 0, minWidth: 0, px: 1, textTransform: "none", fontWeight: 600, fontSize: "var(--fs-xs)", color: "var(--slate-600)" }}
      >
        Reopen
      </MuiButton>
    </Box>
  );
}

function IssueRow({
  issue,
  busy,
  onChange,
  onCancel,
}: {
  issue: Issue;
  busy: boolean;
  onChange: (status: IssueStatusValue) => void;
  onCancel: () => void;
}) {
  const answered = issue.is_done || issue.is_cancelled;
  return (
    <Box
      component="li"
      sx={{ display: "flex", gap: 1.25, px: 2, py: 1.5, borderTop: "1px solid var(--slate-100)", "&:first-of-type": { borderTop: "none" } }}
    >
      <InitialsAvatar name={issue.reported_by} size={30} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 1 }}>
          <Typography noWrap sx={{ fontWeight: 600, fontSize: "var(--fs-sm)", color: "var(--slate-900)", minWidth: 0 }}>
            {issue.reported_by}
          </Typography>
          <Typography sx={{ flexShrink: 0, fontSize: "var(--fs-xs)", color: "var(--slate-500)" }}>
            {formatDateTime(issue.created_at)}
          </Typography>
        </Box>
        <Typography
          sx={{
            mt: 0.25,
            fontSize: "var(--fs-sm)",
            lineHeight: 1.45,
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            color: answered ? "var(--slate-500)" : "var(--slate-700)",
          }}
        >
          {issue.text}
        </Typography>
        {answered ? (
          <Answer issue={issue} busy={busy} onReopen={() => onChange("open")} />
        ) : (
          <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 0.75 }}>
            <MuiButton
              size="small"
              variant="outlined"
              disabled={busy}
              startIcon={<CheckRoundedIcon />}
              onClick={() => onChange("done")}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                fontSize: "var(--fs-xs)",
                borderRadius: "8px",
                color: "var(--slate-700)",
                borderColor: "var(--slate-300)",
                "&:hover": { color: "var(--emerald-700)", borderColor: "var(--emerald-600)", bgcolor: "var(--emerald-50)" },
              }}
            >
              Mark as done
            </MuiButton>
            <MuiButton
              size="small"
              disabled={busy}
              onClick={onCancel}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                fontSize: "var(--fs-xs)",
                borderRadius: "8px",
                color: "var(--slate-500)",
                "&:hover": { color: "var(--red-600)", bgcolor: "var(--red-50)" },
              }}
            >
              Cancel
            </MuiButton>
          </Box>
        )}
      </Box>
    </Box>
  );
}

// Zybran for admins: what employees have reported to it (see IssueHelper.tsx), with
// the count waiting on the robot. Marking one done tells the person who reported it.
export default function AdminIssuesHelper() {
  const queryClient = useQueryClient();
  const showDialog = useConfirmDialogStore((s) => s.showDialog);
  const closeDialog = useConfirmDialogStore((s) => s.closeDialog);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("open");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keeps the badge current without loading the list until someone opens it.
  const waiting = useQuery({
    queryKey: ["issues", "open-count"],
    queryFn: () => apiService.get<IssueList>("/issues/", { params: { status: "open", page_size: 1 } }),
    refetchInterval: POLL_INTERVAL_MS,
  }).data?.open_count;

  const list = useQuery({
    queryKey: ["issues", "admin", filter, page],
    queryFn: () =>
      apiService.get<IssueList>("/issues/", {
        params: { page, page_size: PAGE_SIZE, status: filter === "all" ? undefined : filter },
      }),
    enabled: open,
    refetchInterval: open ? POLL_INTERVAL_MS : false,
    placeholderData: keepPreviousData,
  });
  const issues = list.data?.items ?? [];
  const openCount = list.data?.open_count ?? 0;
  const doneCount = list.data?.done_count ?? 0;
  const cancelledCount = list.data?.cancelled_count ?? 0;
  const empty = EMPTY[filter];

  const changeFilter = (next: Filter) => {
    setFilter(next);
    setPage(1);
  };

  const change = async (issue: Issue, status: IssueStatusValue) => {
    setBusyId(issue.id);
    setError(null);
    try {
      await apiService.patch(`/issues/${issue.id}`, { status });
      await queryClient.invalidateQueries({ queryKey: ["issues"] });
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't update that issue. Please try again."));
    } finally {
      setBusyId(null);
    }
  };

  // Asks first because it tells the employee straight away.
  const confirmCancel = (issue: Issue) => {
    showDialog({
      title: "Cancel this issue?",
      description: `${issue.reported_by} will be told it was cancelled. You can reopen it later.`,
      confirmText: "Cancel issue",
      cancelText: "Keep issue",
      isDestructive: true,
      onConfirm: async () => {
        await change(issue, "cancelled");
        closeDialog();
      },
    });
  };

  return (
    <RobotDock label="issues from employees" open={open} badge={waiting ?? 0} onToggle={() => setOpen((value) => !value)}>
      {open && (
        <RobotPanel label="Issues from employees" subtitle={waitingLabel(waiting)} wide onClose={() => setOpen(false)}>
          <Box sx={{ display: "flex", gap: 0.75, px: 2, py: 1.25, overflowX: "auto", borderBottom: "1px solid var(--slate-200)" }}>
            <FilterPill label="To do" count={openCount} active={filter === "open"} onClick={() => changeFilter("open")} />
            <FilterPill label="Done" count={doneCount} active={filter === "done"} onClick={() => changeFilter("done")} />
            <FilterPill label="Cancelled" count={cancelledCount} active={filter === "cancelled"} onClick={() => changeFilter("cancelled")} />
            <FilterPill label="All" count={openCount + doneCount + cancelledCount} active={filter === "all"} onClick={() => changeFilter("all")} />
          </Box>

          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: 0, py: 0, fontSize: "var(--fs-xs)" }}>
              {error}
            </Alert>
          )}

          <Box sx={{ flex: 1, overflowY: "auto" }}>
            {issues.length > 0 ? (
              <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
                {issues.map((issue) => (
                  <IssueRow
                    key={issue.id}
                    issue={issue}
                    busy={busyId === issue.id}
                    onChange={(status) => change(issue, status)}
                    onCancel={() => confirmCancel(issue)}
                  />
                ))}
              </Box>
            ) : list.isPending || list.isError ? (
              <ListState loading={list.isPending} error={list.isError} empty={false} errorText="Couldn't load the issues." emptyText="" />
            ) : (
              <EmptyState icon={empty.icon} title={empty.title} description={empty.description} />
            )}
          </Box>

          <ListPager page={page} pageSize={PAGE_SIZE} total={list.data?.total ?? 0} onPageChange={setPage} />
        </RobotPanel>
      )}
    </RobotDock>
  );
}
