import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Button as MuiButton, IconButton, InputBase, Tooltip, Typography } from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import StickyNote2RoundedIcon from "@mui/icons-material/StickyNote2Rounded";
import { apiService } from "../../api/service";
import type { Note, NoteListResponse } from "../../api/types";
import { formatDateTime } from "../../format/date";
import { useConfirmDialogStore } from "../../hooks/useconfirmDialogStore";
import { useOnDialogClose } from "../../hooks/useOnDialogClose";
import { messages } from "../../messages";
import { useDialogStore } from "../../store/useDialogStore";
import AsyncSearchSelect from "../../ui/AsyncSearchSelect";
import Button from "../../ui/Button";
import EmptyState from "../../ui/EmptyState";
import FilterPill from "../../ui/FilterPill";
import ListPager from "../../ui/ListPager";
import ListState from "../../ui/ListState";
import PageHeader from "../../ui/PageHeader";
import PageShell from "../../ui/PageShell";
import Panel from "../../ui/Panel";
import { getApiErrorMessage } from "../../utils/apiError";
import { shortcutLabel } from "../../utils/platform";
import { surfaceSx } from "../../ui/surface";

const PAGE_SIZE = 50;

type Filter = "all" | "open" | "done";

interface CustomerOption {
  id: number;
  first_name: string;
  last_name: string;
}

const customerLabel = (c: CustomerOption) => `${c.first_name} ${c.last_name}`;

function CustomerPicker({ value, onChange }: { value?: number; onChange: (id?: number) => void }) {
  return (
    <AsyncSearchSelect
      placeholder="Customer (optional)"
      endpoint="/customers"
      extraParams={{ limit: 20, exclude_placeholders: "true" }}
      getOptionLabel={customerLabel}
      getOptionValue={(c: CustomerOption) => c.id}
      value={value}
      onChange={(v) => onChange(v as number | undefined)}
    />
  );
}

const SHORTCUT = shortcutLabel("Enter");

// Writing a note and editing one are the same form: the text, the customer, and
// a footer with the actions. It only clears itself when there's nothing to go
// back to (adding, not editing).
function NoteForm({
  initialText = "",
  initialCustomerId,
  label,
  placeholder,
  submitLabel,
  autoFocus,
  onSubmit,
  onCancel,
}: {
  initialText?: string;
  initialCustomerId?: number;
  label: string;
  placeholder?: string;
  submitLabel: string;
  autoFocus?: boolean;
  onSubmit: (text: string, customerId?: number) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [text, setText] = useState(initialText);
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    const saved = await onSubmit(text, customerId);
    setSaving(false);
    if (saved && !onCancel) {
      setText("");
      setCustomerId(undefined);
    }
  };

  return (
    <Box
      sx={{
        ...surfaceSx,
        transition: "border-color 0.15s ease, box-shadow 0.15s ease",
        "&:focus-within": { borderColor: "var(--blue-500)", boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.12)" },
      }}
    >
      <InputBase
        fullWidth
        multiline
        minRows={2}
        maxRows={10}
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          if (e.key === "Escape") onCancel?.();
        }}
        inputProps={{ "aria-label": label, maxLength: 5000 }}
        sx={{ px: 2, py: 1.5, fontSize: "var(--fs-md)", color: "var(--slate-900)" }}
      />
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1.5,
          px: 2,
          py: 1,
          bgcolor: "var(--slate-50)",
          borderTop: "1px solid var(--slate-100)",
          borderRadius: "0 0 11px 11px",
        }}
      >
        <Box sx={{ width: { xs: "100%", sm: 260 }, bgcolor: "var(--white)", borderRadius: "8px" }}>
          <CustomerPicker value={customerId} onChange={setCustomerId} />
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, ml: "auto" }}>
          <Typography sx={{ display: { xs: "none", md: "block" }, fontSize: "var(--fs-xs)", color: "var(--slate-400)" }}>{SHORTCUT}</Typography>
          {onCancel && (
            <MuiButton size="small" onClick={onCancel} sx={{ textTransform: "none", fontWeight: 600, color: "var(--slate-600)" }}>
              Cancel
            </MuiButton>
          )}
          <Button onClick={submit} disabled={!text.trim() || saving} size="small">
            {saving ? "Saving…" : submitLabel}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

// The first line reads as the note's title; the rest sit quietly under it.
function NoteText({ text, done }: { text: string; done: boolean }) {
  const lineBreak = text.indexOf("\n");
  const first = lineBreak < 0 ? text : text.slice(0, lineBreak);
  const rest = lineBreak < 0 ? "" : text.slice(lineBreak + 1);
  return (
    <>
      <Typography sx={{ fontSize: "var(--fs-md)", fontWeight: 600, color: done ? "var(--emerald-800)" : "var(--slate-900)", overflowWrap: "anywhere" }}>
        {first}
      </Typography>
      {rest && (
        <Typography sx={{ fontSize: "var(--fs-sm)", color: done ? "var(--emerald-800)" : "var(--slate-600)", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          {rest}
        </Typography>
      )}
    </>
  );
}

function NoteRow({
  note,
  onToggleDone,
  onSaveEdit,
  onDelete,
  onBill,
  onOpenInvoice,
}: {
  note: Note;
  onToggleDone: () => void;
  onSaveEdit: (text: string, customerId?: number) => Promise<boolean>;
  onDelete: () => void;
  onBill: () => void;
  onOpenInvoice: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const done = note.is_done;
  const metaColor = done ? "var(--emerald-700)" : "var(--slate-500)";

  return (
    <Box
      component="li"
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "auto minmax(0, 1fr)", sm: "auto minmax(0, 1fr) auto" },
        columnGap: 1.5,
        rowGap: 1,
        alignItems: "start",
        px: 2,
        py: 1.5,
        bgcolor: done ? "var(--emerald-50)" : "var(--white)",
        boxShadow: done ? "inset 3px 0 0 var(--emerald-500)" : "none",
        transition: "background-color 0.15s ease",
        "& + &": { borderTop: "1px solid", borderTopColor: "var(--slate-100)" },
      }}
    >
      <Tooltip placement="top" title={done ? "Done. Click to mark as not done" : "Click when this job is done"}>
        <Box
          component="button"
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={done ? "Job done. Mark as not done" : "Mark job as done"}
          onClick={onToggleDone}
          sx={{
            width: 26,
            height: 26,
            mt: "1px",
            p: 0,
            display: "grid",
            placeItems: "center",
            borderRadius: "50%",
            border: "2px solid",
            borderColor: done ? "var(--emerald-500)" : "var(--slate-300)",
            bgcolor: done ? "var(--emerald-500)" : "var(--white)",
            color: done ? "var(--white)" : "transparent",
            cursor: "pointer",
            transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease",
            "&:hover": { borderColor: "var(--emerald-500)", color: done ? "var(--white)" : "var(--emerald-500)" },
            "&:focus-visible": { outline: "2px solid var(--blue-500)", outlineOffset: 2 },
          }}
        >
          <CheckRoundedIcon sx={{ fontSize: 17 }} />
        </Box>
      </Tooltip>

      {editing ? (
        <Box sx={{ gridColumn: { xs: "2", sm: "2 / 4" }, minWidth: 0 }}>
          <NoteForm
            autoFocus
            label="Edit note"
            initialText={note.text}
            initialCustomerId={note.customer_id ?? undefined}
            submitLabel="Save"
            onCancel={() => setEditing(false)}
            onSubmit={async (text, customerId) => {
              const saved = await onSaveEdit(text, customerId);
              if (saved) setEditing(false);
              return saved;
            }}
          />
        </Box>
      ) : (
        <>
          <Box sx={{ minWidth: 0 }}>
            <NoteText text={note.text} done={done} />
            <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", columnGap: 1.25, rowGap: 0.25, mt: 0.5, fontSize: "var(--fs-xs)", color: metaColor }}>
              {note.customer_name && (
                <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.4, fontWeight: 600 }}>
                  <PersonRoundedIcon sx={{ fontSize: 14 }} />
                  {note.customer_name}
                </Box>
              )}
              <span>
                {done && note.done_at
                  ? `Done ${formatDateTime(note.done_at)} by ${note.done_by}`
                  : `Added ${formatDateTime(note.created_at)} by ${note.created_by}`}
              </span>
            </Box>
          </Box>

          <Box sx={{ gridColumn: { xs: "2", sm: "3" }, display: "flex", alignItems: "center", justifyContent: { xs: "flex-start", sm: "flex-end" }, gap: 0.5 }}>
            {note.invoice_id ? (
              <MuiButton
                size="small"
                startIcon={<ReceiptLongRoundedIcon />}
                onClick={onOpenInvoice}
                sx={{ textTransform: "none", fontWeight: 600, whiteSpace: "nowrap", borderRadius: "8px" }}
              >
                {note.invoice_number ?? "View invoice"}
              </MuiButton>
            ) : (
              <MuiButton
                size="small"
                variant="outlined"
                startIcon={<ReceiptLongRoundedIcon />}
                onClick={onBill}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  borderRadius: "8px",
                  color: "var(--slate-700)",
                  borderColor: "var(--slate-300)",
                  bgcolor: "var(--white)",
                  "&:hover": { borderColor: "var(--blue-500)", color: "var(--blue-700)", bgcolor: "var(--white)" },
                }}
              >
                Make bill
              </MuiButton>
            )}
            <Tooltip title="Edit">
              <IconButton size="small" aria-label="Edit note" onClick={() => setEditing(true)} sx={{ color: "var(--slate-400)", "&:hover": { color: "var(--slate-700)" } }}>
                <EditRoundedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton
                size="small"
                aria-label="Delete note"
                onClick={onDelete}
                sx={{ color: "var(--slate-400)", "&:hover": { color: "var(--red-600)", bgcolor: "var(--red-50)" } }}
              >
                <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </>
      )}
    </Box>
  );
}

// Quick notes about jobs: write it down, tick it green when it's done, and turn
// it into a bill. Shared by everyone with access, so anyone can tick off anyone's note.
export default function Notes() {
  const queryClient = useQueryClient();
  const { showDialog, closeDialog } = useConfirmDialogStore();
  const openDialog = useDialogStore((s) => s.openDialog);
  const openInvoiceFromNote = useDialogStore((s) => s.openInvoiceFromNote);
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["notes", filter, page],
    queryFn: () =>
      apiService.get<NoteListResponse>("/notes/", {
        params: { page, page_size: PAGE_SIZE, status: filter === "all" ? undefined : filter },
      }),
    placeholderData: keepPreviousData,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["notes"] });

  // A bill made from a note shows up on it as soon as the invoice dialog closes.
  useOnDialogClose(refresh);

  const notes = query.data?.items ?? [];
  // Ticking or deleting the last note on a page shouldn't strand you on an empty one.
  const lastPage = Math.max(1, Math.ceil((query.data?.total ?? 0) / PAGE_SIZE));
  if (query.data && !query.isPlaceholderData && page > lastPage) setPage(lastPage);
  const openCount = query.data?.open_count ?? 0;
  const doneCount = query.data?.done_count ?? 0;

  const changeFilter = (next: Filter) => {
    setFilter(next);
    setPage(1);
  };

  // Turns green the moment it's clicked, without waiting for the server; if the
  // save fails, it goes back and says so.
  const toggleDone = async (note: Note) => {
    const isDone = !note.is_done;
    setError(null);
    queryClient.setQueriesData<NoteListResponse>({ queryKey: ["notes"] }, (old) =>
      old && { ...old, items: old.items.map((n) => (n.id === note.id ? { ...n, is_done: isDone } : n)) },
    );
    try {
      await apiService.patch(`/notes/${note.id}`, { is_done: isDone });
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't update the note. Please try again."));
    }
    refresh();
  };

  const addNote = async (text: string, customerId?: number) => {
    setError(null);
    try {
      await apiService.post("/notes/", { text, customer_id: customerId });
      await refresh();
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't save the note. Please try again."));
      return false;
    }
  };

  const saveEdit = async (note: Note, text: string, customerId?: number) => {
    setError(null);
    try {
      await apiService.patch(`/notes/${note.id}`, { text, customer_id: customerId ?? null });
      await refresh();
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't save the note. Please try again."));
      return false;
    }
  };

  const remove = (note: Note) => {
    showDialog({
      title: "Delete note?",
      description: messages.bin.moveNotice,
      confirmText: "Delete",
      isDestructive: true,
      onConfirm: async () => {
        try {
          await apiService.delete(`/notes/${note.id}`);
          await refresh();
        } catch (err) {
          setError(getApiErrorMessage(err, "Couldn't delete the note. Please try again."));
        } finally {
          closeDialog();
        }
      },
    });
  };

  return (
    <PageShell>
      <Box sx={{ maxWidth: 960, mx: "auto" }}>
        <PageHeader title="Notes" description="Write down jobs, tick them green when they're done, and turn them into bills." />

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: "10px" }}>
              {error}
            </Alert>
          )}

          <NoteForm label="New note" placeholder="What's the job? Each line becomes a row on the bill." submitLabel="Add note" onSubmit={addNote} />

          <Panel
            flush
            title="Jobs"
            action={
              <Box sx={{ display: "flex", gap: 0.75, overflowX: "auto" }}>
                <FilterPill label="All" count={openCount + doneCount} active={filter === "all"} onClick={() => changeFilter("all")} />
                <FilterPill label="To do" count={openCount} active={filter === "open"} onClick={() => changeFilter("open")} />
                <FilterPill label="Done" count={doneCount} active={filter === "done"} onClick={() => changeFilter("done")} />
              </Box>
            }
          >
            {notes.length === 0 ? (
              query.isPending || query.isError ? (
                <ListState loading={query.isPending} error={query.isError} empty={false} errorText="Couldn't load the notes." emptyText="" />
              ) : (
                <EmptyState
                  icon={<StickyNote2RoundedIcon />}
                  title={filter === "done" ? "Nothing's been marked done yet" : filter === "open" ? "Nothing left to do" : "No notes yet"}
                  description={filter === "all" ? "Add your first note above." : "Notes will appear here as they change."}
                />
              )
            ) : (
              <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
                {notes.map((note) => (
                  <NoteRow
                    key={note.id}
                    note={note}
                    onToggleDone={() => toggleDone(note)}
                    onSaveEdit={(text, customerId) => saveEdit(note, text, customerId)}
                    onDelete={() => remove(note)}
                    onBill={() => openInvoiceFromNote({ id: note.id, text: note.text, customerId: note.customer_id ?? undefined })}
                    onOpenInvoice={() => note.invoice_id && openDialog("viewInvoice", note.invoice_id, "view")}
                  />
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
