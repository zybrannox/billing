import { useState, type ReactNode } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Button as MuiButton, CircularProgress, IconButton, Tooltip, Typography } from "@mui/material";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import DeleteForeverRoundedIcon from "@mui/icons-material/DeleteForeverRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import InsertDriveFileRoundedIcon from "@mui/icons-material/InsertDriveFileRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import RequestQuoteRoundedIcon from "@mui/icons-material/RequestQuoteRounded";
import RestoreFromTrashRoundedIcon from "@mui/icons-material/RestoreFromTrashRounded";
import StickyNote2RoundedIcon from "@mui/icons-material/StickyNote2Rounded";
import { apiService } from "../../api/service";
import type { BinItem, BinListResponse } from "../../api/types";
import { formatDateTime } from "../../format/date";
import { useConfirmDialogStore } from "../../hooks/useconfirmDialogStore";
import EmptyState from "../../ui/EmptyState";
import FilterPill from "../../ui/FilterPill";
import ListPager from "../../ui/ListPager";
import ListState from "../../ui/ListState";
import Panel from "../../ui/Panel";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatFileSize } from "../../utils/appSupport";
import { BIN_TYPE_LABELS, daysLeft, daysLeftLabel, daysLeftTone } from "./binFormat";

const PAGE_SIZE = 20;

const TYPE_ICONS: Record<string, ReactNode> = {
  project: <DescriptionRoundedIcon />,
  file: <InsertDriveFileRoundedIcon />,
  note: <StickyNote2RoundedIcon />,
  invoice: <ReceiptLongRoundedIcon />,
  quotation: <RequestQuoteRoundedIcon />,
  customer: <PersonRoundedIcon />,
  company: <ApartmentRoundedIcon />,
  employee: <BadgeRoundedIcon />,
  customer_payment: <PaymentsRoundedIcon />,
};

function BinRow({
  item,
  busy,
  onRestore,
  onErase,
}: {
  item: BinItem;
  busy: boolean;
  onRestore: () => void;
  onErase: () => void;
}) {
  const days = daysLeft(item.expires_at);
  const tone = daysLeftTone(days);
  const typeLabel = BIN_TYPE_LABELS[item.item_type]?.one ?? item.item_type;
  const facts = [typeLabel, item.detail, item.size_bytes > 0 ? formatFileSize(item.size_bytes) : null].filter(Boolean).join(" · ");

  return (
    <Box
      component="li"
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "34px minmax(0, 1fr)", md: "34px minmax(0, 1fr) 190px 100px auto" },
        alignItems: "center",
        columnGap: 1.5,
        rowGap: 1,
        px: 2,
        py: 1.1,
        borderTop: "1px solid var(--slate-100)",
        "&:first-of-type": { borderTop: "none" },
        "&:hover": { bgcolor: "var(--slate-50)" },
      }}
    >
      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: "9px",
          display: "grid",
          placeItems: "center",
          bgcolor: "var(--slate-100)",
          color: "var(--slate-500)",
          "& svg": { fontSize: 18 },
        }}
      >
        {TYPE_ICONS[item.item_type] ?? <DeleteOutlineRoundedIcon />}
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Tooltip title={item.label}>
          <Typography noWrap sx={{ fontSize: "var(--fs-md)", fontWeight: 600, color: "var(--slate-900)" }}>
            {item.label}
          </Typography>
        </Tooltip>
        <Typography noWrap sx={{ fontSize: "var(--fs-xs)", color: "var(--slate-500)" }}>
          {facts}
        </Typography>
      </Box>

      <Box sx={{ minWidth: 0, gridColumn: { xs: "2", md: "auto" } }}>
        <Typography noWrap sx={{ fontSize: "var(--fs-sm)", color: "var(--slate-700)" }}>
          {formatDateTime(item.deleted_at)}
        </Typography>
        <Typography noWrap sx={{ fontSize: "var(--fs-xs)", color: "var(--slate-500)" }}>
          by {item.deleted_by}
        </Typography>
      </Box>

      <Tooltip title={`Permanently deleted on ${formatDateTime(item.expires_at)}`}>
        <Box
          sx={{
            gridColumn: { xs: "2", md: "auto" },
            justifySelf: "start",
            px: 1,
            py: 0.25,
            borderRadius: "999px",
            fontSize: "var(--fs-2xs)",
            fontWeight: 700,
            whiteSpace: "nowrap",
            color: tone.fg,
            bgcolor: tone.bg,
          }}
        >
          {daysLeftLabel(days)}
        </Box>
      </Tooltip>

      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, gridColumn: { xs: "2", md: "auto" } }}>
        <MuiButton
          size="small"
          variant="outlined"
          disabled={busy}
          startIcon={busy ? <CircularProgress size={13} /> : <RestoreFromTrashRoundedIcon />}
          onClick={onRestore}
          sx={{ textTransform: "none", fontWeight: 600, borderRadius: "8px", whiteSpace: "nowrap" }}
        >
          Restore
        </MuiButton>
        <Tooltip title="Delete forever">
          <span>
            <IconButton
              size="small"
              aria-label={`Delete ${item.label} forever`}
              disabled={busy}
              onClick={onErase}
              sx={{ color: "var(--slate-400)", "&:hover": { color: "var(--red-600)", bgcolor: "var(--red-50)" } }}
            >
              <DeleteForeverRoundedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
}

// Everything deleted in the last 14 days, to restore or erase early. The server
// erases each item when its time is up (see app/bin on the backend).
export default function BinPanel() {
  const queryClient = useQueryClient();
  const { showDialog, closeDialog } = useConfirmDialogStore();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const query = useQuery({
    queryKey: ["bin", filter, page],
    queryFn: () =>
      apiService.get<BinListResponse>("/bin/", {
        params: { page, page_size: PAGE_SIZE, item_type: filter ?? undefined },
      }),
    placeholderData: keepPreviousData,
  });

  const data = query.data;
  const items = data?.items ?? [];
  const counts = data?.counts ?? [];
  const totalInBin = counts.reduce((sum, c) => sum + c.count, 0);
  const retentionDays = data?.retention_days ?? 14;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["bin"] });

  const changeFilter = (next: string | null) => {
    setFilter(next);
    setPage(1);
  };

  const restore = async (item: BinItem) => {
    setBusyId(item.id);
    setNotice(null);
    try {
      await apiService.post(`/bin/${item.id}/restore`);
      setNotice({ tone: "success", text: `"${item.label}" has been restored.` });
      await refresh();
    } catch (err) {
      setNotice({ tone: "error", text: getApiErrorMessage(err, "Couldn't restore this. Please try again.") });
    } finally {
      setBusyId(null);
    }
  };

  const erase = (item: BinItem) => {
    showDialog({
      title: "Delete forever?",
      description: `"${item.label}" and everything that belongs to it will be permanently deleted. This can't be undone.`,
      confirmText: "Delete forever",
      isDestructive: true,
      onConfirm: async () => {
        try {
          await apiService.delete(`/bin/${item.id}`);
          setNotice({ tone: "success", text: `"${item.label}" has been permanently deleted.` });
          await refresh();
        } catch (err) {
          setNotice({ tone: "error", text: getApiErrorMessage(err, "Couldn't delete this. Please try again.") });
        } finally {
          closeDialog();
        }
      },
    });
  };

  const emptyBin = () => {
    showDialog({
      title: "Empty the bin?",
      description: `All ${totalInBin} ${totalInBin === 1 ? "item" : "items"} will be permanently deleted. This can't be undone.`,
      confirmText: "Empty bin",
      isDestructive: true,
      onConfirm: async () => {
        try {
          await apiService.delete("/bin/");
          setNotice({ tone: "success", text: "The bin has been emptied." });
          changeFilter(null);
          await refresh();
        } catch (err) {
          setNotice({ tone: "error", text: getApiErrorMessage(err, "Couldn't empty the bin. Please try again.") });
        } finally {
          closeDialog();
        }
      },
    });
  };

  const summary = totalInBin
    ? `${totalInBin} ${totalInBin === 1 ? "item" : "items"}${data?.total_size_bytes ? ` · ${formatFileSize(data.total_size_bytes)} of files` : ""} · each is permanently deleted ${retentionDays} days after it was deleted`
    : `Deleted items stay here for ${retentionDays} days, then are permanently deleted.`;

  return (
    <>
      {notice && (
        <Alert severity={notice.tone} onClose={() => setNotice(null)} sx={{ borderRadius: "10px" }}>
          {notice.text}
        </Alert>
      )}

      <Panel
        flush
        title="Deleted items"
        description={summary}
        action={
          totalInBin > 0 ? (
            <MuiButton
              size="small"
              color="error"
              startIcon={<DeleteForeverRoundedIcon />}
              onClick={emptyBin}
              sx={{ textTransform: "none", fontWeight: 600, borderRadius: "8px" }}
            >
              Empty bin
            </MuiButton>
          ) : undefined
        }
      >
        {totalInBin > 0 && (
          <Box sx={{ display: "flex", gap: 0.75, px: 2, py: 1.25, overflowX: "auto", borderBottom: "1px solid var(--slate-100)" }}>
            <FilterPill label="All" count={totalInBin} active={filter === null} onClick={() => changeFilter(null)} />
            {counts.map((c) => (
              <FilterPill
                key={c.item_type}
                label={BIN_TYPE_LABELS[c.item_type]?.many ?? c.item_type}
                count={c.count}
                active={filter === c.item_type}
                onClick={() => changeFilter(c.item_type)}
              />
            ))}
          </Box>
        )}

        {items.length === 0 ? (
          query.isPending || query.isError ? (
            <Box sx={{ p: 2.5 }}>
              <ListState
                loading={query.isPending}
                error={query.isError}
                empty={false}
                errorText="Couldn't load the bin."
                emptyText=""
              />
            </Box>
          ) : (
            <EmptyState
              icon={<DeleteOutlineRoundedIcon />}
              title="The bin is empty"
              description={`When you delete a project, file, customer or employee, it comes here first. You'll have ${retentionDays} days to restore it.`}
            />
          )
        ) : (
          <>
            <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
              {items.map((item) => (
                <BinRow
                  key={item.id}
                  item={item}
                  busy={busyId === item.id}
                  onRestore={() => restore(item)}
                  onErase={() => erase(item)}
                />
              ))}
            </Box>
            <Box sx={{ display: "flex", justifyContent: "flex-end", px: 2, py: 1, borderTop: "1px solid var(--slate-100)", "&:empty": { display: "none" } }}>
              <ListPager page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onPageChange={setPage} />
            </Box>
          </>
        )}
      </Panel>
    </>
  );
}
