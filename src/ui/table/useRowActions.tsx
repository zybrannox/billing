import React from "react";
import {
  GridActionsCellItem,
  GridRowModes,
  type GridRowId,
  type GridRowModesModel,
  type GridRowParams,
  type useGridApiRef,
} from "@mui/x-data-grid";
import CancelIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import { useConfirmDialogStore } from "../../hooks/useconfirmDialogStore";
import { messages } from "../../messages";
import { useDownloadProgressStore } from "../../store/useDownloadProgressStore";
import { useProjectStore, type Project } from "../../store/useProjectStore";
import { getTransferErrorMessage } from "../../utils/apiError";

export interface RowActionHandlers {
  edit: () => void;
  delete: () => void;
  download: () => void;
  save: () => void;
  cancel: () => void;
  toggle: () => void;
  preview: () => void;
}

// What each row's Actions cell shows: Save and Cancel while the row is being
// edited, otherwise whatever the caller renders, given these handlers.
export function useRowActions({
  apiRef,
  rowModesModel,
  setRowModesModel,
  renderActions,
  onDelete,
  onDownload,
  onEdit,
  onCancel,
  onToggle,
}: {
  apiRef: ReturnType<typeof useGridApiRef>;
  rowModesModel: GridRowModesModel;
  setRowModesModel: React.Dispatch<React.SetStateAction<GridRowModesModel>>;
  renderActions?: (params: GridRowParams, handlers: RowActionHandlers) => React.ReactElement[];
  onDelete?: (id: GridRowId) => void | Promise<void>;
  onDownload?: (id: GridRowId) => void;
  onEdit?: (id: GridRowId) => void;
  onCancel?: (id: GridRowId) => void;
  onToggle?: (id: GridRowId, value: boolean) => void;
}) {
  const showDialog = useConfirmDialogStore((state) => state.showDialog);
  const closeDialog = useConfirmDialogStore((state) => state.closeDialog);
  const setLoading = useConfirmDialogStore((state) => state.setLoading);
  const deleteProject = useProjectStore((state) => state.deleteProject);
  const setSelectedProject = useProjectStore((state) => state.setSelectedProject);
  const downloadProject = useProjectStore((state) => state.downloadProject);
  const refreshProject = useProjectStore((state) => state.refreshProject);

  // Callers often pass fresh callbacks each render; reading the latest through a
  // ref keeps getActions (and so the grid's columns) stable without going stale.
  const latest = React.useRef({ onDelete, onDownload, onEdit, onCancel, onToggle });
  React.useEffect(() => {
    latest.current = { onDelete, onDownload, onEdit, onCancel, onToggle };
  }, [onDelete, onDownload, onEdit, onCancel, onToggle]);

  const getActions = React.useCallback(
    (params: GridRowParams) => {
      const { id } = params;

      const cancel = () => {
        setRowModesModel((prev) => ({ ...prev, [id]: { mode: GridRowModes.View, ignoreModifications: true } }));
        latest.current.onCancel?.(id);
      };
      const save = () => {
        apiRef.current?.stopRowEditMode({ id, ignoreModifications: false });
      };

      if (rowModesModel[id]?.mode === GridRowModes.Edit) {
        return [
          <GridActionsCellItem key="save" icon={<SaveIcon sx={{ fontSize: "var(--fs-3xl)" }} />} label="Save" onClick={save} />,
          <GridActionsCellItem key="cancel" icon={<CancelIcon sx={{ fontSize: "var(--fs-3xl)" }} />} label="Cancel" onClick={cancel} />,
        ];
      }
      if (!renderActions) return [];

      return renderActions(params, {
        save,
        cancel,
        edit: () => {
          setRowModesModel((prev) => ({ ...prev, [id]: { mode: GridRowModes.Edit } }));
          latest.current.onEdit?.(id);
        },
        delete: () => {
          showDialog({
            title: "Delete Record?",
            description: messages.bin.moveNotice,
            confirmText: "Delete",
            isDestructive: true,
            onConfirm: async () => {
              setLoading(true);
              if (latest.current.onDelete) {
                await latest.current.onDelete(id);
              } else {
                await deleteProject(id as string);
              }
              setLoading(false);
              closeDialog();
            },
          });
        },
        download: () => {
          const fileCount = (params.row as { file_paths?: unknown[] }).file_paths?.length;
          showDialog({
            title: "Download Files?",
            description: "Do You Like to Download all The Files.",
            confirmText: "Yes",
            isDestructive: true,
            onConfirm: async () => {
              // Close the confirm dialog right away instead of blocking it with a
              // spinner for the whole download: the floating progress indicator
              // takes over from here so the rest of the UI stays usable.
              closeDialog();
              const { start, update, finish, fail } = useDownloadProgressStore.getState();
              const downloadId = `project-zip-${id}`;
              start(downloadId, "Downloading project files…", fileCount);
              try {
                await downloadProject(id as string, (progress) => update(downloadId, progress));
              } catch (err) {
                console.error("Download failed", err);
                fail(downloadId, getTransferErrorMessage(err, "download"));
                return;
              }
              finish(downloadId);
              latest.current.onDownload?.(id);
              // downloadProject has confirmed the download by now, flipping
              // `downloaded` on the project's files: refetch so the accordion
              // file list picks up the change.
              await refreshProject(id as string).catch((err) => console.error("Could not refresh the project", err));
            },
          });
        },
        toggle: () => {
          const isActive = !!params.row.isActive;
          showDialog({
            title: isActive ? "Deactivate Item?" : "Activate Item?",
            description: `Do you want to ${isActive ? "deactivate" : "activate"} this item?`,
            confirmText: isActive ? "Deactivate" : "Activate",
            onConfirm: async () => {
              setLoading(true);
              latest.current.onToggle?.(id, !isActive);
              setLoading(false);
              closeDialog();
            },
          });
        },
        preview: () => setSelectedProject(params.row as unknown as Project),
      });
    },
    [
      apiRef,
      rowModesModel,
      setRowModesModel,
      renderActions,
      showDialog,
      closeDialog,
      setLoading,
      deleteProject,
      downloadProject,
      refreshProject,
      setSelectedProject,
    ],
  );

  return getActions;
}
