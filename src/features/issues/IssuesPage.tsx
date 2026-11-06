import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Button as MuiButton, Typography } from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import { apiService } from "../../api/service";
import type { Issue, IssueList } from "../../api/types";
import { formatDateTime } from "../../format/date";
import EmptyState from "../../ui/EmptyState";
import FilterPill from "../../ui/FilterPill";
import ListPager from "../../ui/ListPager";
import ListState from "../../ui/ListState";
import PageHeader from "../../ui/PageHeader";
import PageShell from "../../ui/PageShell";
import Panel from "../../ui/Panel";
import { getApiErrorMessage } from "../../utils/apiError";

const PAGE_SIZE = 50;

type Filter = "open" | "done" | "all";

function IssueRow({ issue, busy, onToggle }: { issue: Issue; busy: boolean; onToggle: () => void }) {
  return (
    <Box
      component="li"
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "stretch", sm: "flex-start" },
        gap: 1.5,
        px: 2,
        py: 1.5,
        borderTop: "1px solid var(--slate-100)",
        "&:first-of-type": { borderTop: "none" },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
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
        <Typography sx={{ mt: 0.5, fontSize: "var(--fs-xs)", color: "var(--slate-500)" }}>
          {issue.reported_by} · {formatDateTime(issue.created_at)}
          {issue.is_done && ` · Done by ${issue.done_by ?? "an admin"}, ${formatDateTime(issue.done_at)}`}
        </Typography>
      </Box>
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
  );
}

// What employees have reported to Zybran, the robot helper (see IssueHelper.tsx). Marking
// one done tells the person who reported it.
export default function IssuesPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("open");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["issues", "admin", filter, page],
    queryFn: () =>
      apiService.get<IssueList>("/issues/", {
        params: { page, page_size: PAGE_SIZE, status: filter === "all" ? undefined : filter },
      }),
    placeholderData: keepPreviousData,
  });

  const issues = query.data?.items ?? [];
  const openCount = query.data?.open_count ?? 0;
  const doneCount = query.data?.done_count ?? 0;

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
    <PageShell>
      <Box sx={{ maxWidth: 960, mx: "auto" }}>
        <PageHeader title="Issues" description="Problems employees have reported to Zybran. Marking one as done tells the person who reported it." />

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: "10px" }}>
              {error}
            </Alert>
          )}

          <Panel
            flush
            title="Reported issues"
            action={
              <Box sx={{ display: "flex", gap: 0.75, overflowX: "auto" }}>
                <FilterPill label="To do" count={openCount} active={filter === "open"} onClick={() => changeFilter("open")} />
                <FilterPill label="Done" count={doneCount} active={filter === "done"} onClick={() => changeFilter("done")} />
                <FilterPill label="All" count={openCount + doneCount} active={filter === "all"} onClick={() => changeFilter("all")} />
              </Box>
            }
          >
            {issues.length === 0 ? (
              query.isPending || query.isError ? (
                <ListState loading={query.isPending} error={query.isError} empty={false} errorText="Couldn't load the issues." emptyText="" />
              ) : (
                <EmptyState
                  icon={<SupportAgentRoundedIcon />}
                  title={filter === "done" ? "Nothing's been marked done yet" : filter === "open" ? "All clear" : "No issues yet"}
                  description={filter === "done" ? undefined : "Anything employees report to Zybran shows up here."}
                />
              )
            ) : (
              <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
                {issues.map((issue) => (
                  <IssueRow key={issue.id} issue={issue} busy={busyId === issue.id} onToggle={() => toggle(issue)} />
                ))}
              </Box>
            )}
            <ListPager page={page} pageSize={PAGE_SIZE} total={query.data?.total ?? 0} onPageChange={setPage} />
          </Panel>
        </Box>
      </Box>
    </PageShell>
  );
}
