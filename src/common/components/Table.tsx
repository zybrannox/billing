import {
  DataGrid,
  type GridColDef,
  type GridRowsProp,
  type GridRowParams,
  type GridRowModel,
  type GridRowId,
  useGridApiRef,
  type GridRowClassNameParams,
  type GridInitialState,
  type GridRowSelectionModel,
  type GridPaginationModel,
  type GridSortModel,
  type GridEventListener,
} from "@mui/x-data-grid";
import React from "react";
import GlobalStyles from "@mui/material/GlobalStyles";
import { useConfirmDialogStore } from "../../hooks/useconfirmDialogStore";
import { useProjectStore } from "../../store/useProjectStore";
import { useDownloadProgressStore } from "../../store/useDownloadProgressStore";
import {
  GridActionsCellItem,
  GridRowModes,
  type GridRowModesModel,
} from "@mui/x-data-grid";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Close";

interface TableProps<T extends GridRowModel> {
  rows: GridRowsProp<T>;
  columns: GridColDef<T>[];
  processRowUpdate?: (newRow: T, oldRow: T) => Promise<T>;
  getRowClassName?: (params: GridRowClassNameParams<T>) => string;
  renderActions?: (
    params: GridRowParams,
    handlers: {
      edit: () => void;
      delete: () => void;
      download: () => void;
      save: () => void;
      cancel: () => void;
      toggle: () => void;
      preview: () => void;
    },
  ) => React.ReactElement[];
  onSave?: (row: GridRowModel) => void;
  onDelete?: (id: GridRowId) => void | Promise<void>;
  onEdit?: (id: GridRowId) => void;
  onDownload?: (id: GridRowId) => void;
  onCancel?: (id: GridRowId) => void;
  onAdd?: () => void;
  onToggle?: (id: GridRowId, value: boolean) => void;
  onRowSelect?: (row: T) => void;
  onSelectionChange?: (ids: GridRowId[]) => void;
  rowSelectionModel?: GridRowId[]; // Keep as GridRowId[] for compatibility
  initialState?: GridInitialState;
  checkboxSelection?: boolean;
  paginationMode?: "client" | "server";
  rowCount?: number;
  paginationModel?: GridPaginationModel;
  onPaginationModelChange?: (model: GridPaginationModel) => void;
  sortingMode?: "client" | "server";
  sortModel?: GridSortModel;
  onSortModelChange?: (model: GridSortModel) => void;
  loading?: boolean;
  pageSizeOptions?: number[];
  actionsWidth?: number;
  renderDetailPanel?: (row: T) => React.ReactNode;
  hideActionsColumn?: boolean;
  expandedRowId?: GridRowId | null;
  onExpandedRowIdChange?: (id: GridRowId | null) => void;
}

export default function Table<T extends GridRowModel>({
  rows,
  columns,
  processRowUpdate,
  getRowClassName,
  renderActions,
  onSave,
  onDelete,
  onEdit,
  onDownload,
  onCancel,
  onToggle,
  onRowSelect,
  onSelectionChange,
  rowSelectionModel,
  checkboxSelection,
  initialState,
  paginationMode,
  rowCount,
  paginationModel,
  onPaginationModelChange,
  sortingMode,
  sortModel,
  onSortModelChange,
  loading,
  pageSizeOptions,
  actionsWidth,
  renderDetailPanel,
  hideActionsColumn,
  expandedRowId: expandedRowIdProp,
  onExpandedRowIdChange,
}: TableProps<T>) {
const gridSx = React.useMemo(
  () => ({
    borderRadius: "12px",
    color: "var(--slate-900)",
    boxShadow: "none",
    border: "1px solid var(--slate-200)",
    backgroundColor: "var(--white)",
    "--DataGrid-rowBorderColor": "var(--slate-100)",

    ...(onRowSelect || renderDetailPanel
      ? {
          "& .MuiDataGrid-row:not(.row-detail-panel)": { cursor: "pointer" },
        }
      : {}),

    "& .MuiCheckbox-root": {
      color: "var(--slate-500) !important",
      p: 0.75,
    },
    "& .MuiDataGrid-main": {
      borderTopLeftRadius: "12px",
      borderTopRightRadius: "12px",
      overflow: "hidden",
    },
    "& .MuiDataGrid-columnHeader .MuiDataGrid-columnHeaderTitleContainer .MuiCheckbox-root":
      {
        color: "var(--slate-600) !important",
      },
    "& .MuiDataGrid-columnHeader .Mui-checked": {
      color: "var(--blue-600) !important",
    },
    "& .Mui-checked": {
      color: "var(--blue-600) !important",
    },
    "& .MuiCheckbox-root:hover": {
      backgroundColor: "rgba(37, 99, 235, 0.04) !important",
    },
    "& .Mui-focusVisible": { outline: "none" },
    "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": {
      outline: "none !important",
    },
    "& .MuiDataGrid-row:last-of-type": {
      borderBottom: "none",
    },
    "& .MuiDataGrid-row": {
      backgroundColor: "var(--white)",
    },
    "& .MuiDataGrid-row.Mui-selected": {
      backgroundColor: "rgba(37, 99, 235, 0.04)",
    },
    "& .MuiDataGrid-row.Mui-selected:hover": {
      backgroundColor: "rgba(37, 99, 235, 0.08)",
    },
    "& .MuiDataGrid-row:hover": {
      backgroundColor: "var(--slate-50)",
    },
    "& .MuiDataGrid-columnHeader": {
      color: "var(--slate-600)",
      backgroundColor: "var(--slate-50)",
    },
    "& .MuiDataGrid-columnHeaderTitle": {
      color: "var(--slate-700)",
      fontWeight: 700,
      fontSize: "0.75rem",
      letterSpacing: "0.05em",
      textTransform: "uppercase",
    },
    "& .MuiDataGrid-columnHeaders": {
      backgroundColor: "var(--slate-50)",
      borderBottom: "1px solid var(--slate-200)",
    },
    "& .MuiDataGrid-footerContainer": {
      borderTop: "1px solid var(--slate-200) !important",
      backgroundColor: "var(--white)",
    },
    "& .MuiDataGrid-footerContainer .MuiDataGrid-pagination": {
      color: "var(--slate-600)",
    },
    "& .MuiTablePagination-title": { color: "var(--slate-600)" },
    "& .MuiTablePagination-displayedRows": { color: "var(--slate-600)" },
    "& .MuiTablePagination-selectLabel": { color: "var(--slate-600)", fontSize: "0.8125rem" },
    // Minimal, matching the pagination prev/next buttons right next to it
    // (transparent by default, a soft hover pill, no persistent border/box)
    // rather than a fully outlined input - this is a footer control, not a
    // form field.
    "& .MuiTablePagination-select": {
      display: "flex",
      alignItems: "center",
      color: "var(--slate-700)",
      fontSize: "0.8125rem",
      fontWeight: 500,
      borderRadius: "8px",
      padding: "4px 22px 4px 8px",
      transition: "background-color 0.15s ease",
      "&:hover, &:focus": {
        backgroundColor: "rgba(100, 116, 139, 0.08)",
      },
    },
    "& .MuiTablePagination-selectIcon": {
      color: "var(--slate-500)",
      right: "2px",
    },
    "& .MuiTablePagination-actions svg": { fill: "var(--slate-500)" },
    "& .MuiTablePagination-actions button": {
      borderRadius: "8px",
      transition: "background-color 0.15s ease",
      "&:hover": { backgroundColor: "rgba(100, 116, 139, 0.08)" },
    },

    // Editing row styles
    "& .MuiDataGrid-virtualScrollerRenderZone > div.MuiDataGrid-row.MuiDataGrid-row--editing":
      {
        backgroundColor: "var(--blue-50) !important",
        transition: "all 200ms ease-in-out",
      },
    "& .MuiOutlinedInput-notchedOutline": {
      border: "1px solid var(--slate-300)",
    },
    "&:hover .MuiOutlinedInput-notchedOutline": {
      border: "1px solid var(--slate-400)",
    },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      border: "2px solid var(--blue-600)",
    },
    "& .MuiDataGrid-virtualScrollerRenderZone > div.MuiDataGrid-row.MuiDataGrid-row--editing .MuiDataGrid-cell":
      {
        backgroundColor: "transparent !important",
        color: "var(--slate-900) !important",
      },

    // Save/Cancel row-edit actions - rounded pill + tinted hover, matching
    // every other row action (ui/Actions.tsx's actionIconSx). Targeted by
    // aria-label since GridActionsCellItem's MUI X v8 types don't expose
    // an `sx` prop to style these directly.
    '& button[aria-label="Save"]': {
      padding: "5px",
      borderRadius: "8px",
      color: "var(--emerald-600)",
      backgroundColor: "rgba(5, 150, 105, 0.06)",
      transition: "all 0.15s ease-in-out",
    },
    '& button[aria-label="Save"]:hover': {
      backgroundColor: "rgba(5, 150, 105, 0.12)",
    },
    '& button[aria-label="Cancel"]': {
      padding: "5px",
      borderRadius: "8px",
      color: "var(--rose-600)",
      backgroundColor: "rgba(225, 29, 72, 0.06)",
      transition: "all 0.15s ease-in-out",
    },
    '& button[aria-label="Cancel"]:hover': {
      backgroundColor: "rgba(225, 29, 72, 0.12)",
    },
    '& button[aria-label="Save"]:active, & button[aria-label="Cancel"]:active':
      {
        transform: "scale(0.95)",
      },

    // Status indicator rows
    // Went 0.05 -> 0.14 first pass, still read as barely-there. Pushed
    // further into clearly-saturated territory - still light enough for
    // the default dark slate cell text to stay comfortably readable on
    // top, verified against the actual rendered rows, not just picked
    // blind.
    "& .MuiDataGrid-row.row-print-completed": {
      backgroundColor: "rgba(16, 185, 129, 0.32)",
    },
    "& .MuiDataGrid-row.row-print-completed:hover": {
      backgroundColor: "rgba(16, 185, 129, 0.4)",
    },
    "& .MuiDataGrid-row.row-print-completed.Mui-selected": {
      backgroundColor: "rgba(16, 185, 129, 0.48)",
    },

    // Pinned rows - yellow, matching the pin action icon's color so the
    // row tint and the icon that toggled it read as the same signal.
    "& .MuiDataGrid-row.row-pinned": {
      backgroundColor: "rgba(202, 138, 4, 0.28)",
    },
    "& .MuiDataGrid-row.row-pinned:hover": {
      backgroundColor: "rgba(202, 138, 4, 0.36)",
    },
    "& .MuiDataGrid-row.row-pinned.Mui-selected": {
      backgroundColor: "rgba(202, 138, 4, 0.44)",
    },

    // Accordion detail-panel row (see renderDetailPanel) - a plain content
    // area, not another data row, so it shouldn't pick up row hover/click
    // affordances. The checkbox column sits outside the columns we control
    // (MUI adds it internally for checkboxSelection), so isRowSelectable
    // only disables it - it still rendered a visible grayed-out checkbox.
    // Hiding it here removes it from view entirely instead.
    "& .MuiDataGrid-row.row-detail-panel": {
      backgroundColor: "var(--slate-50)",
      cursor: "default",
    },
    "& .MuiDataGrid-row.row-detail-panel:hover": {
      backgroundColor: "var(--slate-50)",
    },
    "& .MuiDataGrid-row.row-detail-panel .MuiDataGrid-cell": {
      cursor: "default",
    },
    "& .MuiDataGrid-row.row-detail-panel .MuiDataGrid-cellCheckbox": {
      visibility: "hidden",
    },

    // Loading state - the default MUI skeleton/progress-bar overlay reads
    // as an unstyled placeholder (flat mid-gray, no relation to the app's
    // palette). Recoloring it to the same slate/blue tokens as the rest of
    // the grid (see column headers, hover states above) makes it read as
    // an intentional part of the table rather than a generic fallback.
    "& .MuiDataGrid-overlay": {
      backgroundColor: "rgba(255, 255, 255, 0.7)",
    },
    "& .MuiDataGrid-rowSkeleton .MuiSkeleton-root": {
      backgroundColor: "rgba(37, 99, 235, 0.1)",
    },
    "& .MuiLinearProgress-root": {
      backgroundColor: "rgba(37, 99, 235, 0.12)",
    },
    "& .MuiLinearProgress-bar": {
      backgroundColor: "var(--blue-600)",
    },
  }),
  [onRowSelect, renderDetailPanel],
);

  const apiRef = useGridApiRef();
  // Pull dialog methods once to avoid repeated getter calls.
  const showDialog = useConfirmDialogStore((state) => state.showDialog);
  const closeDialog = useConfirmDialogStore((state) => state.closeDialog);
  const setLoading = useConfirmDialogStore((state) => state.setLoading);
  const deleteProject = useProjectStore((state) => state.deleteProject);
  const setSelectedProject = useProjectStore((state) => state.setSelectedProject);
  const downloadProject = useProjectStore((state) => state.downloadProject);
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const [rowModesModel, setRowModesModel] = React.useState<GridRowModesModel>(
    {},
  );
  const [internalExpandedRowId, setExpandedRowId] = React.useState<GridRowId | null>(
    null,
  );
  // See the expandedRowId prop's doc comment - controlled when the caller
  // passes it, otherwise Table's own click-driven state (unchanged).
  const expandedRowId = expandedRowIdProp !== undefined ? expandedRowIdProp : internalExpandedRowId;

  // Refs for callbacks to avoid stale closures and unnecessary deps
  const onDeleteRef = React.useRef(onDelete);
  React.useEffect(() => {
    onDeleteRef.current = onDelete;
  }, [onDelete]);

  const onDownloadRef = React.useRef(onDownload);
  React.useEffect(() => {
    onDownloadRef.current = onDownload;
  }, [onDownload]);

  const onEditRef = React.useRef(onEdit);
  React.useEffect(() => {
    onEditRef.current = onEdit;
  }, [onEdit]);

  const onCancelRef = React.useRef(onCancel);
  React.useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  const onSaveRef = React.useRef(onSave);
  React.useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const onToggleRef = React.useRef(onToggle);
  React.useEffect(() => {
    onToggleRef.current = onToggle;
  }, [onToggle]);

  // Handlers (stable via useCallback)
  const handleEditClick = React.useCallback(
    (id: GridRowId) => () => {
      setRowModesModel((prev) => ({
        ...prev,
        [id]: { mode: GridRowModes.Edit },
      }));
      onEditRef.current?.(id);
    },
    [],
  );

  const handleCancelClick = React.useCallback(
    (id: GridRowId) => () => {
      setRowModesModel((prev) => ({
        ...prev,
        [id]: {
          mode: GridRowModes.View,
          ignoreModifications: true,
        },
      }));
      onCancelRef.current?.(id);
    },
    [],
  );

  const handleSaveClick = React.useCallback(
    (id: GridRowId) => () => {
      if (!apiRef.current) return;
      apiRef.current.stopRowEditMode({
        id,
        ignoreModifications: false,
      });
    },
    [apiRef],
  );

  const handleDeleteClick = React.useCallback(
    (id: GridRowId) => () => {
      showDialog({
        title: "Delete Record?",
        description: "This action cannot be undone.",
        confirmText: "Delete",
        isDestructive: true,
        onConfirm: async () => {
          setLoading(true);
          if (onDeleteRef.current) {
            await onDeleteRef.current(id);
          } else {
            await deleteProject(id as string);
          }
          setLoading(false);
          closeDialog();
        },
      });
    },
    [showDialog, setLoading, closeDialog, deleteProject], // include deleteProject here
  );

  const handleDownloadClick = React.useCallback(
    (id: GridRowId, fileCount?: number) => () => {
      showDialog({
        title: "Download Files?",
        description: "Do You Like to Download all The Files.",
        confirmText: "Yes",
        isDestructive: true,
        onConfirm: async () => {
          // Close the confirm dialog right away instead of blocking it with a
          // spinner for the whole download — the floating progress indicator
          // takes over from here so the rest of the UI stays usable.
          closeDialog();
          const { start, update, finish, remove } = useDownloadProgressStore.getState();
          const downloadId = `project-zip-${id}`;
          start(downloadId, "Downloading project files…", fileCount);
          // downloadProject resolves to false (rather than throwing) on
          // failure - that's the actual success/fail signal to branch on,
          // not a try/catch.
          const success = await downloadProject(id as string, (progress) =>
            update(downloadId, progress),
          );
          if (success) {
            // The backend flips `downloaded` on every file in the project as
            // part of serving the zip - refetch so the accordion file list
            // (and anyone else looking at this project) picks up the change.
            await refreshProject(id as string);
            onDownloadRef.current?.(id);
            finish(downloadId);
          } else {
            remove(downloadId);
          }
        },
      });
    },
    [showDialog, closeDialog, downloadProject, refreshProject],
  );

  const handlePreviewClick = React.useCallback(
    (row: T) => () => {
      setSelectedProject(row as any);
    },
    [setSelectedProject],
  );

  const handleToggleClick = React.useCallback(
    (params: GridRowParams) => () => {
      const id = params.id;
      const isActive = !!params.row.isActive; // ensure boolean

      showDialog({
        title: isActive ? "Deactivate Item?" : "Activate Item?",
        description: `Do you want to ${isActive ? "deactivate" : "activate"
          } this item?`,
        confirmText: isActive ? "Deactivate" : "Activate",
        onConfirm: async () => {
          setLoading(true);

          onToggleRef.current?.(id, !isActive);

          setLoading(false);
          closeDialog();
        },
      });
    },
    [showDialog, closeDialog, setLoading],
  );

  const getActions = React.useCallback(
    (params: GridRowParams) => {
      const isEditing = rowModesModel[params.id]?.mode === GridRowModes.Edit;

      if (isEditing) {
        return [
          <GridActionsCellItem
            key="save"
            icon={<SaveIcon sx={{ fontSize: "1.125rem" }} />}
            label="Save"
            onClick={handleSaveClick(params.id)}
          />,
          <GridActionsCellItem
            key="cancel"
            icon={<CancelIcon sx={{ fontSize: "1.125rem" }} />}
            label="Cancel"
            onClick={handleCancelClick(params.id)}
          />,
        ];
      }

      return renderActions
        ? renderActions(params, {
          edit: handleEditClick(params.id),
          delete: handleDeleteClick(params.id),
          download: handleDownloadClick(
            params.id,
            (params.row as any).file_paths?.length,
          ),
          save: handleSaveClick(params.id),
          cancel: handleCancelClick(params.id),
          toggle: handleToggleClick(params),
          preview: handlePreviewClick(params.row as T),
        })
        : [];
    },
    [
      rowModesModel,
      renderActions,
      handleEditClick,
      handleDeleteClick,
      handleDownloadClick,
      handleSaveClick,
      handleCancelClick,
      handleToggleClick,
      handlePreviewClick,
    ],
  );

  const mergedColumns: GridColDef[] = React.useMemo(() => {
    const totalColumnSpan = columns.length + 1; 
    const editableColumns = columns.map((col) => ({
      ...col,
      editable: col.editable ?? Boolean(processRowUpdate),
    }));
    const dataColumns = renderDetailPanel
      ? editableColumns.map((col, idx) => {
        if (idx !== 0) return col;
        return {
          ...col,
          colSpan: ((_value: unknown, row: any) =>
            row?.__detailPanelFor !== undefined
              ? totalColumnSpan
              : undefined) as GridColDef["colSpan"],
          renderCell: (params: any) => {
            if (params.row?.__detailPanelFor !== undefined) {
              const parentRow = (rows as any[]).find(
                (r) => r.id === params.row.__detailPanelFor,
              );
              return (
                <div className="w-full px-4 py-3 animate-detail-panel-in">
                  {parentRow ? renderDetailPanel(parentRow as T) : null}
                </div>
              );
            }
            return col.renderCell ? col.renderCell(params) : params.value;
          },
        };
      })
      : editableColumns;

    if (hideActionsColumn) return dataColumns;

    return [
      ...dataColumns,
      {
        field: "actions",
        type: "actions",
        headerName: "Actions",
        width: actionsWidth ?? 180,
        getActions,
      },
    ];
  }, [columns, getActions, actionsWidth, renderDetailPanel, rows, hideActionsColumn, processRowUpdate]);

  // The synthetic detail row is spliced in right after its parent so it
  // renders adjacent to it, same as any accordion panel - only ever one at
  // a time (true accordion, not independently-expandable rows).
  const rowsWithDetail = React.useMemo(() => {
    if (!renderDetailPanel || expandedRowId == null) return rows;
    const result: any[] = [];
    for (const row of rows as any[]) {
      result.push(row);
      if (row.id === expandedRowId) {
        result.push({ id: `${row.id}__detail`, __detailPanelFor: row.id });
      }
    }
    return result;
  }, [rows, renderDetailPanel, expandedRowId]);

  // "auto" measures the panel's actual rendered content height instead of
  // guessing a fixed number - correct regardless of what a given
  // renderDetailPanel puts in it, and it's a genuine Community-edition
  // DataGrid feature (unlike the Pro-only detail-panel API this whole
  // accordion is standing in for).
  const getRowHeight = React.useCallback(
    (params: { id: GridRowId; model: any }) =>
      params.model?.__detailPanelFor !== undefined ? "auto" : null,
    [],
  );

  const isRowSelectable = React.useCallback(
    (params: { row: any }) => params.row?.__detailPanelFor === undefined,
    [],
  );

  const wrappedGetRowClassName = React.useCallback(
    (params: GridRowClassNameParams<any>) => {
      if (params.row?.__detailPanelFor !== undefined) return "row-detail-panel";
      return getRowClassName ? getRowClassName(params) : "";
    },
    [getRowClassName],
  );

  // A fresh {type, ids} object (and fresh Set) on every render makes the
  // DataGrid think selection changed even when it didn't - memoize it so it
  // only changes when the caller's selection actually does.
  const selectionModel = React.useMemo(
    () => ({
      type: "include" as const,
      ids: new Set(rowSelectionModel || []),
    }),
    [rowSelectionModel],
  );

  const getRowId = React.useCallback((row: T) => row.id, []);

  const handleSelectionModelChange = React.useCallback(
    (newSelectionModel: GridRowSelectionModel) => {
      if (!onSelectionChange) return;
      if (newSelectionModel.type === "include") {
        onSelectionChange(Array.from(newSelectionModel.ids));
      } else {
        // Handle "exclude" (select everything except these IDs)
        const excludedIds = newSelectionModel.ids;
        const selectedIds = rows
          .map((r) => r.id)
          .filter((id) => !excludedIds.has(id));
        onSelectionChange(selectedIds as GridRowId[]);
      }
    },
    [onSelectionChange, rows],
  );

  const handleRowEditStop = React.useCallback<GridEventListener<"rowEditStop">>(
    (params, event) => {
      // Prevent auto save on focus loss
      if (params.reason === "rowFocusOut") {
        event.defaultMuiPrevented = true;
      }
    },
    [],
  );

  const handleProcessRowUpdateError = React.useCallback((error: unknown) => {
    console.error(error);
    // The row already reverts itself (MUI's own behavior when
    // processRowUpdate rejects) - this just tells the user *why*, e.g. the
    // backend rejecting an invalid print-status transition.
    const message =
      (error as { response?: { data?: { detail?: string } } })?.response
        ?.data?.detail;
    if (message) alert(message);
  }, []);

  const handleRowClick = React.useCallback<GridEventListener<"rowClick">>(
    (params, event) => {
      // Don't trigger row selection if clicking on checkbox or an action
      // button (edit/delete/etc.) - those already have their own meaning,
      // and with onRowSelect wired up (see below) letting the click bubble
      // through would fire both at once, e.g. deleting a row AND
      // navigating away from the page that delete was just triggered on.
      const target = event.target as HTMLElement;
      const isCheckbox =
        target.closest(".MuiCheckbox-root") ||
        target.closest('[data-field="__check__"]');
      const isActionCell = target.closest('[data-field="actions"]');

      if (isCheckbox || isActionCell) return;

      // The synthetic detail-panel row (see rowsWithDetail) isn't a real
      // data row - whatever's inside it (see renderDetailPanel) handles
      // its own clicks, or doesn't need to. Checked before onRowSelect
      // below: a caller combining onRowSelect with renderDetailPanel (see
      // Customers.tsx, where a specific cell - not the row - opens the
      // panel) would otherwise have onRowSelect fire with this row's
      // garbage synthetic data (no real id, none of T's fields) whenever
      // the user clicks non-interactive space inside the expanded panel.
      if ((params.row as any)?.__detailPanelFor !== undefined) return;

      // Callers that want a real click-through (e.g. Customers.tsx opening
      // a customer's profile page) opt in via onRowSelect instead of this
      // grid's own project-preview/detail-panel behavior below, which is
      // specific to the Projects table and doesn't apply to every table
      // this component renders. Skipped while the row is mid-edit (its
      // cells are live inputs at that point) - navigating away on a click
      // meant to place a text cursor would silently discard the edit.
      const isEditingRow = rowModesModel[params.id]?.mode === GridRowModes.Edit;
      if (onRowSelect && !isEditingRow) {
        onRowSelect(params.row as T);
        return;
      }

      if (renderDetailPanel) {
        if (onExpandedRowIdChange) {
          // Controlled - the caller owns this state (see Customers.tsx)
          // and renders its own row data straight from renderDetailPanel's
          // row argument, so the legacy setSelectedProject side effect
          // below (which only ProjectFilesList.tsx actually reads) is
          // skipped entirely rather than writing this table's row shape
          // into a store that has nothing to do with it.
          onExpandedRowIdChange(expandedRowId === params.id ? null : params.id);
        } else {
          setExpandedRowId((prev) => (prev === params.id ? null : params.id));
          setSelectedProject(params.row);
        }
        return;
      }

      setSelectedProject(params.row);
    },
    [setSelectedProject, renderDetailPanel, onRowSelect, onExpandedRowIdChange, expandedRowId, rowModesModel],
  );

  const preventDefaultCellDoubleClick = React.useCallback<
    GridEventListener<"cellDoubleClick">
  >((_params, event) => {
    event.defaultMuiPrevented = true;
  }, []);

  const resolvedInitialState = React.useMemo(
    () => ({
      ...initialState,
      pagination: {
        paginationModel: { pageSize: 10, page: 0 },
        ...initialState?.pagination,
      },
    }),
    [initialState],
  );

  return (
    <div
      style={{
        boxShadow: "0 0 15px rgba(255, 255, 255, 0.2)",
        borderRadius: "12px",
      }}
      className="w-full overflow-x-auto"
    >
      <GlobalStyles
        styles={{
          ".MuiPopover-paper.MuiMenu-paper.MuiPaper-elevation8": {
            boxShadow:
              "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
          },
          // way animating height directly would.
          "@keyframes detailPanelIn": {
            from: { opacity: 0, transform: "translateY(-6px)" },
            to: { opacity: 1, transform: "translateY(0)" },
          },
          ".animate-detail-panel-in": {
            animation: "detailPanelIn 220ms ease-out",
          },
          "@media (prefers-reduced-motion: reduce)": {
            ".animate-detail-panel-in": { animation: "none" },
          },
        }}
      />
      <DataGrid<T>
        apiRef={apiRef}
        rows={rowsWithDetail as GridRowsProp<T>}
        columns={mergedColumns}
        getRowId={getRowId}
        sx={gridSx}
        disableRowSelectionOnClick
        initialState={resolvedInitialState}
        disableColumnFilter
        disableColumnMenu
        checkboxSelection={checkboxSelection ?? false}
        rowSelectionModel={selectionModel}
        onRowSelectionModelChange={handleSelectionModelChange}
        isRowSelectable={renderDetailPanel ? isRowSelectable : undefined}
        editMode="row" // enable editing
        rowModesModel={rowModesModel}
        onRowModesModelChange={setRowModesModel}
        processRowUpdate={processRowUpdate}
        getRowClassName={wrappedGetRowClassName}
        getRowHeight={renderDetailPanel ? getRowHeight : undefined}
        onRowEditStop={handleRowEditStop}
        onProcessRowUpdateError={handleProcessRowUpdateError}
        onRowClick={handleRowClick}
        onCellDoubleClick={preventDefaultCellDoubleClick}
        autoHeight
        pageSizeOptions={pageSizeOptions ?? [10, 20, 30, 50, 100]}
        paginationMode={paginationMode ?? "client"}
        rowCount={paginationMode === "server" ? rowCount : undefined}
        paginationModel={paginationModel}
        onPaginationModelChange={onPaginationModelChange}
        sortingMode={sortingMode ?? "client"}
        sortModel={sortModel}
        onSortModelChange={onSortModelChange}
        loading={loading}
        slotProps={{
          loadingOverlay: {
            variant: "skeleton",
            noRowsVariant: "skeleton",
          },
        }}
      />
    </div>
  );
}
