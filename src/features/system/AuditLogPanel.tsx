import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Box, Typography } from "@mui/material";
import { apiService } from "../../api/service";
import type { AuditLogListResponse } from "../../api/types";
import { formatDateTime } from "../../format/date";
import { formatRupees } from "../../format/money";
import ListPager from "../../ui/ListPager";
import EmptyState from "../../ui/EmptyState";
import ListState from "../../ui/ListState";
import Panel from "../../ui/Panel";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";

const PAGE_SIZE = 20;
const COLUMNS = { xs: "1fr", md: "1.1fr 0.8fr 1.1fr 1.6fr" };

// "invoice.cancel" -> "Invoice cancelled" style labels for the actions the
// server records; anything unknown falls back to the raw action string.
const ACTION_LABELS: Record<string, string> = {
  "invoice.payment": "Payment recorded",
  "invoice.mark_paid": "Marked paid",
  "invoice.cancel": "Invoice cancelled",
  "invoice.update": "Invoice edited",
  "invoice.delete": "Invoice deleted",
  "quotation.accepted": "Quotation accepted",
  "quotation.rejected": "Quotation rejected",
  "quotation.delete": "Quotation deleted",
  "project.delete": "Project deleted",
  "project.bulk_delete": "Projects deleted",
  "customer.delete": "Customer deleted",
  "company.delete": "Company deleted",
  "user.delete": "Employee deleted",
  "user.revoke_sessions": "Signed out everywhere",
  "auth.lockout": "Account locked (failed sign-ins)",
};

// Money in is green, anything removed is red, the rest is neutral blue - so a
// scan down the Action column shows what kind of event each row is.
const toneOf = (action: string) =>
  action.endsWith("delete") || action.includes("cancel") || action.includes("lockout") || action.includes("reject")
    ? { fg: "var(--red-700)", bg: "var(--red-50)" }
    : action.includes("payment") || action.includes("paid") || action.includes("accepted")
      ? { fg: "var(--emerald-700)", bg: "var(--emerald-50)" }
      : { fg: "var(--blue-700)", bg: "var(--blue-50)" };

const describe = (detail: Record<string, unknown> | null): string => {
  if (!detail) return "";
  const parts: string[] = [];
  if (detail.label) parts.push(String(detail.label));
  if (typeof detail.amount === "number") parts.push(formatRupees(detail.amount));
  if (detail.payment_method) parts.push(String(detail.payment_method));
  return parts.join(" · ");
};

const headCell = {
  fontSize: "var(--fs-xs)",
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--slate-400)",
} as const;

// Read-only history of money and destructive actions (the server only ever
// appends to it). Admin-only endpoint.
export default function AuditLogPanel() {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["audit-log", page],
    queryFn: () => apiService.get<AuditLogListResponse>("/audit-log/", { params: { page, page_size: PAGE_SIZE } }),
    placeholderData: keepPreviousData,
  });
  const rows = query.data?.items ?? [];

  return (
    <Panel
      flush
      title="Audit Log"
      description="Payments, cancellations and deletions. Entries can't be edited or removed."
      action={<ListPager page={page} pageSize={PAGE_SIZE} total={query.data?.total ?? 0} onPageChange={setPage} />}
    >
      {rows.length === 0 ? (
        query.isPending || query.isError ? (
          <Box sx={{ p: 2.5 }}>
            <ListState
              loading={query.isPending}
              error={query.isError}
              empty={false}
              errorText="Couldn't load the audit log."
              emptyText=""
            />
          </Box>
        ) : (
          <EmptyState
            icon={<HistoryRoundedIcon />}
            title="Nothing recorded yet"
            description="Payments, cancellations and deletions will appear here as they happen."
          />
        )
      ) : (
        <Box>
          <Box sx={{ display: { xs: "none", md: "grid" }, gridTemplateColumns: COLUMNS, gap: 2, px: 2, py: 0.75, bgcolor: "var(--slate-50)" }}>
            <Typography sx={headCell}>When</Typography>
            <Typography sx={headCell}>Who</Typography>
            <Typography sx={headCell}>Action</Typography>
            <Typography sx={headCell}>Details</Typography>
          </Box>
          {rows.map((entry) => (
            <Box
              key={entry.id}
              sx={{
                display: "grid",
                gridTemplateColumns: COLUMNS,
                gap: { xs: 0.25, md: 2 },
                px: 2,
                py: 0.9,
                alignItems: "center",
                borderTop: "1px solid var(--slate-100)",
                "&:hover": { bgcolor: "var(--slate-50)" },
              }}
            >
              <Typography sx={{ fontSize: "var(--fs-xs)", color: "var(--slate-500)" }}>{formatDateTime(entry.at)}</Typography>
              <Typography sx={{ fontSize: "var(--fs-sm)", color: "var(--slate-700)" }}>{entry.actor}</Typography>
              <Box>
                <Box
                  component="span"
                  sx={{ display: "inline-block", px: 1, py: 0.2, borderRadius: "999px", fontSize: "var(--fs-2xs)", fontWeight: 700, color: toneOf(entry.action).fg, bgcolor: toneOf(entry.action).bg }}
                >
                  {ACTION_LABELS[entry.action] ?? entry.action}
                </Box>
              </Box>
              <Typography sx={{ fontSize: "var(--fs-sm)", color: "var(--slate-600)", wordBreak: "break-word" }}>
                {describe(entry.detail) || `${entry.entity_type} #${entry.entity_id ?? "—"}`}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Panel>
  );
}
