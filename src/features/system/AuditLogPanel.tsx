import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Box, Typography } from "@mui/material";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import { apiService } from "../../api/service";
import type { AuditLogListResponse } from "../../api/types";
import { formatDateTime } from "../../format/date";
import EmptyState from "../../ui/EmptyState";
import FilterPill from "../../ui/FilterPill";
import ListPager from "../../ui/ListPager";
import ListState from "../../ui/ListState";
import Panel from "../../ui/Panel";
import { actionLabel, actionTone, actorLabel, changesOf, summaryOf, viewOfChange, type AuditChange } from "./auditFormat";

const PAGE_SIZE = 20;
const COLUMNS = { xs: "1fr", md: "150px 130px 170px minmax(0, 1fr)" };
// An entry for something new can list a dozen fields; the first few are usually enough.
const CHANGES_SHOWN = 4;

const FILTERS: { label: string; entityType: string | null }[] = [
  { label: "All", entityType: null },
  { label: "Projects", entityType: "project" },
  { label: "Files", entityType: "file" },
  { label: "Notes", entityType: "note" },
  { label: "Invoices", entityType: "invoice" },
  { label: "Quotations", entityType: "quotation" },
  { label: "Customers", entityType: "customer" },
  { label: "Companies", entityType: "company" },
  { label: "Employees", entityType: "user" },
  { label: "Dropdowns", entityType: "list_option" },
];

const headCell = {
  fontSize: "var(--fs-xs)",
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--slate-400)",
} as const;

const valueSx = {
  display: "inline",
  px: 0.625,
  py: 0.125,
  borderRadius: "5px",
  fontSize: "var(--fs-xs)",
  fontWeight: 600,
  wordBreak: "break-word",
  boxDecorationBreak: "clone",
  WebkitBoxDecorationBreak: "clone",
} as const;

// "Print status: [Pending] → [In Progress]", with the old value struck through
// so the direction of the change can't be misread at a glance.
function ChangeLine({ change, isNew }: { change: AuditChange; isNew: boolean }) {
  const view = viewOfChange(change, isNew);
  const lineSx = { fontSize: "var(--fs-xs)", color: "var(--slate-600)", lineHeight: 1.9, wordBreak: "break-word" } as const;
  if (view.kind === "note") return <Typography sx={lineSx}>{view.text}</Typography>;
  if (view.kind === "value") {
    return (
      <Typography sx={lineSx}>
        {view.label}: <Box component="span" sx={{ fontWeight: 600, color: "var(--slate-800)" }}>{view.value}</Box>
      </Typography>
    );
  }
  return (
    <Typography sx={lineSx}>
      {view.label}:{" "}
      <Box component="span" sx={{ ...valueSx, color: "var(--red-700)", bgcolor: "var(--red-50)", textDecoration: "line-through" }}>
        {view.from}
      </Box>
      {" → "}
      <Box component="span" sx={{ ...valueSx, color: "var(--emerald-700)", bgcolor: "var(--emerald-50)" }}>
        {view.to}
      </Box>
    </Typography>
  );
}

function EntryDetails({ entry }: { entry: AuditLogListResponse["items"][number] }) {
  const [expanded, setExpanded] = useState(false);
  const changes = changesOf(entry.detail);
  const shown = expanded ? changes : changes.slice(0, CHANGES_SHOWN);
  const note = entry.detail?.note ? String(entry.detail.note) : null;

  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--slate-800)", wordBreak: "break-word" }}>
        {summaryOf(entry.detail) || `${entry.entity_type} #${entry.entity_id ?? "—"}`}
      </Typography>
      {note && <Typography sx={{ fontSize: "var(--fs-xs)", color: "var(--slate-500)" }}>{note}</Typography>}
      {shown.map((change) => (
        <ChangeLine key={change.field} change={change} isNew={entry.action.endsWith(".create")} />
      ))}
      {changes.length > CHANGES_SHOWN && (
        <Box
          component="button"
          type="button"
          onClick={() => setExpanded(!expanded)}
          sx={{
            p: 0,
            mt: 0.25,
            border: 0,
            bgcolor: "transparent",
            fontFamily: "inherit",
            fontSize: "var(--fs-xs)",
            fontWeight: 600,
            color: "var(--blue-600)",
            cursor: "pointer",
            "&:hover": { textDecoration: "underline" },
          }}
        >
          {expanded ? "Show less" : `Show ${changes.length - CHANGES_SHOWN} more`}
        </Box>
      )}
    </Box>
  );
}

// Everything that was added, edited or deleted: what, when and by whom. Entries
// are written by the server as changes are saved, and only ever appended to.
export default function AuditLogPanel() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["audit-log", entityType, page],
    queryFn: () =>
      apiService.get<AuditLogListResponse>("/audit-log/", {
        params: { page, page_size: PAGE_SIZE, entity_type: entityType ?? undefined },
      }),
    placeholderData: keepPreviousData,
  });
  const rows = query.data?.items ?? [];

  return (
    <Panel
      flush
      title="Activity log"
      description="Everything added, edited or deleted, with the old and new values. Entries can't be edited or removed."
      action={<ListPager page={page} pageSize={PAGE_SIZE} total={query.data?.total ?? 0} onPageChange={setPage} />}
    >
      <Box sx={{ display: "flex", gap: 0.75, px: 2, py: 1.25, overflowX: "auto", borderBottom: "1px solid var(--slate-100)" }}>
        {FILTERS.map((filter) => (
          <FilterPill
            key={filter.label}
            label={filter.label}
            active={entityType === filter.entityType}
            onClick={() => {
              setEntityType(filter.entityType);
              setPage(1);
            }}
          />
        ))}
      </Box>

      {rows.length === 0 ? (
        query.isPending || query.isError ? (
          <Box sx={{ p: 2.5 }}>
            <ListState
              loading={query.isPending}
              error={query.isError}
              empty={false}
              errorText="Couldn't load the activity."
              emptyText=""
            />
          </Box>
        ) : (
          <EmptyState
            icon={<HistoryRoundedIcon />}
            title="Nothing recorded yet"
            description="Everything added, edited or deleted will appear here as it happens."
          />
        )
      ) : (
        <Box>
          <Box sx={{ display: { xs: "none", md: "grid" }, gridTemplateColumns: COLUMNS, gap: 2, px: 2, py: 0.75, bgcolor: "var(--slate-50)" }}>
            <Typography sx={headCell}>When</Typography>
            <Typography sx={headCell}>Who</Typography>
            <Typography sx={headCell}>Action</Typography>
            <Typography sx={headCell}>What changed</Typography>
          </Box>
          {rows.map((entry) => {
            const tone = actionTone(entry.action);
            return (
              <Box
                key={entry.id}
                sx={{
                  display: "grid",
                  gridTemplateColumns: COLUMNS,
                  gap: { xs: 0.25, md: 2 },
                  px: 2,
                  py: 1,
                  alignItems: "start",
                  borderTop: "1px solid var(--slate-100)",
                  "&:hover": { bgcolor: "var(--slate-50)" },
                }}
              >
                <Typography sx={{ fontSize: "var(--fs-xs)", color: "var(--slate-500)" }}>{formatDateTime(entry.at)}</Typography>
                <Typography sx={{ fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--slate-700)", wordBreak: "break-word" }}>
                  {actorLabel(entry.actor)}
                </Typography>
                <Box>
                  <Box
                    component="span"
                    sx={{ display: "inline-block", px: 1, py: 0.2, borderRadius: "999px", fontSize: "var(--fs-2xs)", fontWeight: 700, color: tone.fg, bgcolor: tone.bg }}
                  >
                    {actionLabel(entry.action)}
                  </Box>
                </Box>
                <EntryDetails entry={entry} />
              </Box>
            );
          })}
        </Box>
      )}
    </Panel>
  );
}
