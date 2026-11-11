import { notify } from "../../../store/useNoticeStore";
import { useState } from "react";
import { Box, Checkbox, Stack, Typography } from "@mui/material";
import { apiService } from "../../../api/service";
import { useConfirmDialogStore } from "../../../hooks/useconfirmDialogStore";
import { messages } from "../../../messages";
import { useProjectStore } from "../../../store/useProjectStore";
import BulkDeleteButton from "../../../ui/BulkDeleteButton";
import { GenericDialog } from "../../../ui/Dialog";
import ManageFileRow from "./ManageFileRow";
import { displayName, storagePath, type ProjectFile } from "./projectFile";

// Every file on the project, for selecting and removing several at once. Only
// rendered on demand, in a scroll container, so it stays cheap at any count.
export default function ManageFilesDialog({
  open,
  files,
  onClose,
  onOpenFile,
  onDownload,
}: {
  open: boolean;
  files: ProjectFile[];
  onClose: () => void;
  onOpenFile: (index: number) => void;
  onDownload: (path: string, name: string) => void;
}) {
  const selectedProject = useProjectStore((state) => state.selectedProject);
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const { showDialog } = useConfirmDialogStore();
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [removingPath, setRemovingPath] = useState<string | null>(null);
  const [bulkRemoving, setBulkRemoving] = useState(false);

  const total = files.length;

  const toggleSelected = (path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedPaths((prev) => (prev.size === total ? new Set() : new Set(files.map(storagePath))));
  };

  // A failure shows inside the confirm dialog (see useConfirmDialogStore), which
  // stays open to retry, so these don't catch.
  const removeFile = (path: string, name: string) => {
    if (!selectedProject) return;
    showDialog({
      title: "Remove file?",
      description: `"${name}": ${messages.bin.moveNotice}`,
      confirmText: "Remove",
      isDestructive: true,
      onConfirm: async () => {
        setRemovingPath(path);
        try {
          await apiService.delete(`/files/${encodeURIComponent(path)}`);
          notify.success("File moved to the Bin", { message: name });
          await refreshProject(selectedProject.id);
        } finally {
          setRemovingPath(null);
        }
      },
    });
  };

  // One request for the whole selection (see POST /files/bulk-delete), not N
  // single deletes for what's really one "remove these" from the user's side.
  const removeSelected = () => {
    if (!selectedProject || selectedPaths.size === 0) return;
    const paths = Array.from(selectedPaths);
    showDialog({
      title: `Remove ${paths.length} ${paths.length === 1 ? "file" : "files"}?`,
      description:
        paths.length === 1 ? messages.bin.moveNotice : "They will move to the Bin in System setup, where an admin can restore them for 14 days.",
      confirmText: "Remove",
      isDestructive: true,
      onConfirm: async () => {
        setBulkRemoving(true);
        try {
          await apiService.post("/files/bulk-delete", { paths });
          setSelectedPaths(new Set());
          await refreshProject(selectedProject.id);
        } finally {
          setBulkRemoving(false);
        }
      },
    });
  };

  return (
    <GenericDialog
      open={open}
      onClose={() => {
        onClose();
        setSelectedPaths(new Set());
      }}
      title={`${total} ${total === 1 ? "File" : "Files"}`}
      maxWidth="xs"
      width="26rem"
    >
      {total > 0 && (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1, px: 0.5 }}>
          <Box onClick={toggleSelectAll} sx={{ display: "flex", alignItems: "center", gap: 0.5, cursor: "pointer", userSelect: "none" }}>
            <Checkbox
              size="small"
              checked={selectedPaths.size === total}
              indeterminate={selectedPaths.size > 0 && selectedPaths.size < total}
              sx={{ p: 0.5 }}
            />
            <Typography sx={{ fontSize: "var(--fs-xs)", color: "var(--slate-500)", fontWeight: 500 }}>Select all</Typography>
          </Box>

          {selectedPaths.size > 0 && (
            <BulkDeleteButton
              selectedCount={bulkRemoving ? 0 : selectedPaths.size}
              onDelete={removeSelected}
              tooltipTitle={bulkRemoving ? "Removing…" : "Remove selected files"}
              sx={{ height: 30, width: 30, minWidth: 30 }}
            />
          )}
        </Box>
      )}

      <Stack
        spacing={0.75}
        sx={{
          maxHeight: 420,
          overflowY: "auto",
          mx: -1,
          px: 1,
          "::-webkit-scrollbar": { width: "6px" },
          "::-webkit-scrollbar-thumb": { backgroundColor: "var(--slate-300)", borderRadius: "10px" },
          "::-webkit-scrollbar-track": { backgroundColor: "var(--slate-100)" },
        }}
      >
        {files.map((file, index) => {
          const path = storagePath(file);
          const name = displayName(file);
          return (
            <ManageFileRow
              key={path}
              file={file}
              selected={selectedPaths.has(path)}
              removing={removingPath === path}
              onOpen={() => onOpenFile(index)}
              onToggleSelected={() => toggleSelected(path)}
              onDownload={() => onDownload(path, name)}
              onRemove={() => removeFile(path, name)}
            />
          );
        })}
      </Stack>
    </GenericDialog>
  );
}
