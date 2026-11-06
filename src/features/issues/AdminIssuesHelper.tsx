import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Button as MuiButton, Typography } from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import { apiService } from "../../api/service";
import type { Issue, IssueList } from "../../api/types";
import { formatDateTime } from "../../format/date";
import FilterPill from "../../ui/FilterPill";
import ListPager from "../../ui/ListPager";
import ListState from "../../ui/ListState";
import { getApiErrorMessage } from "../../utils/apiError";
import { RobotDock, RobotPanel } from "./RobotDock";

// Same pace as the admin's notification bell.
const POLL_INTERVAL_MS = 60_000;
const PAGE_SIZE = 20;

type Filter = "open" | "done" | "all";

const EMPTY_TEXT: Record<Filter, string> = {
  open: "All clear. Nothing is waiting on you.",
  done: "Nothing's been marked done yet.",
  all: "No one has reported an issue yet.",
};

function IssueRow({ issue, busy, onToggle }: { issue: Issue; busy: boolean; onToggle: () => void }) {
  return (
    <Box component="li" sx={{ px: 1.5, py: 1.25, borderTop: "1px solid var(--slate-100)", "&:first-of-type": { borderTop: "none" } }}>
      <Typography
        sx={{
          fontSize: "var(--fs-sm)",
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
          color: issue.is_done ? "var(--slate-500)" : "var(--slate-900)",
        }}
      >
        {issue.text}
      </Typography>
      <Box sx={{ mt: 0.75, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
        <Typography sx={{ fontSize: "var(--fs-xs)", color: "var(--slate-500)", minWidth: 0 }}>
          {issue.reported_by} · {formatDateTime(issue.created_at)}
          {issue.is_done && ` · Done by ${issue.done_by ?? "an admin"}, ${formatDateTime(issue.done_at)}`}
        </Typography>
        <MuiButton
          size="small"
          variant={issue.is_done ? "text" : "outlined"}
          color={issue.is_done ? "inherit" : "success"}
          disabled={busy}
          startIcon={issue.is_done ? <ReplayRoundedIcon /> : <CheckRoundedIcon />}
          onClick={onToggle}
          sx={{ flexShrink: 0, textTransform: "none", fontWeight: 600, whiteSpace: "nowrap", borderRadius: "8px" }}
        >
          {issue.is_done ? "Reopen" : "Mark as done"}
        </MuiButton>
      </Box>
    </Box>
  );
}

// Zybran for admins: what employees have reported to it (see IssueHelper.tsx), with
// the count waiting on the robot. Marking one done tells the person who reported it.
export default function AdminIssuesHelper() {
  const queryClient = useQueryClient();
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

  const changeFilter = (next: Filter) => {
    setFilter(next);
    setPage(1);
  };

  const toggle = async (issue: Issue) => {
    setBusyId(issue.id);
    setError(null);
    try {
      await apiService.patch(`/issues/${issue.id}`, { is_done: !issue.is_done });
      await queryClient.invalidateQueries({ queryKey: ["issues"] });
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't update that issue. Please try again."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <RobotDock label="issues from employees" open={open} badge={waiting ?? 0} onToggle={() => setOpen((value) => !value)}>
      {open && (
        <RobotPanel label="Issues from employees" subtitle="Issues your employees have reported" wide onClose={() => setOpen(false)}>
          <Box sx={{ display: "flex", gap: 0.75, px: 1.5, py: 1, overflowX: "auto", borderBottom: "1px solid var(--slate-200)" }}>
            <FilterPill label="To do" count={openCount} active={filter === "open"} onClick={() => changeFilter("open")} />
            <FilterPill label="Done" count={doneCount} active={filter === "done"} onClick={() => changeFilter("done")} />
            <FilterPill label="All" count={openCount + doneCount} active={filter === "all"} onClick={() => changeFilter("all")} />
          </Box>

          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: 0, py: 0, fontSize: "var(--fs-xs)" }}>
              {error}
            </Alert>
          )}

          <Box sx={{ flex: 1, overflowY: "auto" }}>
            {issues.length === 0 ? (
              <ListState
                loading={list.isPending}
                error={list.isError}
                empty
                errorText="Couldn't load the issues."
                emptyText={EMPTY_TEXT[filter]}
              />
            ) : (
              <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
                {issues.map((issue) => (
                  <IssueRow key={issue.id} issue={issue} busy={busyId === issue.id} onToggle={() => toggle(issue)} />
                ))}
              </Box>
            )}
          </Box>

          <ListPager page={page} pageSize={PAGE_SIZE} total={list.data?.total ?? 0} onPageChange={setPage} />
        </RobotPanel>
      )}
    </RobotDock>
  );
}
