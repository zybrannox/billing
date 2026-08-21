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
  // When provided, the built-in Delete action calls this instead of
  // deleting a project — use it for tables that show a different entity
  // (e.g. employees) so Delete hits the right endpoint.
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
  // Server-side pagination/sorting (opt-in). When omitted, the grid behaves
  // exactly as before: client-side pagination/sorting over the full `rows`.
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
  // Opt-in accordion-style row expansion: clicking a row spans a full-width
  // panel underneath it instead of (or as well as) driving some external
  // preview. Only one row is ever expanded at a time - clicking a second
  // row collapses the first, matching standard accordion behavior. Built
  // on the grid's real "column spanning" feature (a synthetic row inserted
  // after the expanded one, whose first cell spans every column) rather
  // than MUI X's row-detail-panel API, which is Pro-only and not available
  // on the Community package this app uses.
  renderDetailPanel?: (row: T) => React.ReactNode;
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
  // onAdd,
  onCancel,
  onToggle,
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
}: TableProps<T>) {
const gridSx = React.useMemo(
  () => ({
    borderRadius: "12px",
    color: "#0F172A",
    boxShadow: "none",
    border: "1px solid #E2E8F0",
    backgroundColor: "#FFFFFF",
    "--DataGrid-rowBorderColor": "#F1F5F9",

    "& .MuiCheckbox-root": {
      color: "#64748B !important",
      p: 0.75,
    },
    "& .MuiDataGrid-main": {
      borderTopLeftRadius: "12px",
      borderTopRightRadius: "12px",
      overflow: "hidden",
    },
    "& .MuiDataGrid-columnHeader .MuiDataGrid-columnHeaderTitleContainer .MuiCheckbox-root":
      {
        color: "#475569 !important",
      },
    "& .MuiDataGrid-columnHeader .Mui-checked": {
      color: "#2563EB !important",
    },
    "& .Mui-checked": {
      color: "#2563EB !important",
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
    "& .MuiDataGrid-row.Mui-selected": {
      backgroundColor: "rgba(37, 99, 235, 0.04)",
    },
    "& .MuiDataGrid-row.Mui-selected:hover": {
      backgroundColor: "rgba(37, 99, 235, 0.08)",
    },
    "& .MuiDataGrid-row:hover": {
      backgroundColor: "#F8FAFC",
    },
    "& .MuiDataGrid-columnHeader": {
      color: "#475569",
      backgroundColor: "#F8FAFC",
    },
    "& .MuiDataGrid-columnHeaderTitle": {
      color: "#334155",
      fontWeight: 700,
      fontSize: "0.75rem",
      letterSpacing: "0.05em",
      textTransform: "uppercase",
    },
    "& .MuiDataGrid-columnHeaders": {
      backgroundColor: "#F8FAFC",
      borderBottom: "1px solid #E2E8F0",
    },
    "& .MuiDataGrid-footerContainer": {
      borderTop: "1px solid #E2E8F0 !important",
      backgroundColor: "#FFFFFF",
    },
    "& .MuiDataGrid-footerContainer .MuiDataGrid-pagination": {
      color: "#475569",
    },
    "& .MuiTablePagination-title": { color: "#475569" },
    "& .MuiTablePagination-displayedRows": { color: "#475569" },
    "& .MuiTablePagination-selectLabel": { color: "#475569", fontSize: "0.8125rem" },
    // Minimal, matching the pagination prev/next buttons right next to it
    // (transparent by default, a soft hover pill, no persistent border/box)
    // rather than a fully outlined input - this is a footer control, not a
    // form field.
    "& .MuiTablePagination-select": {
      display: "flex",
      alignItems: "center",
      color: "#334155",
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
      color: "#64748B",
      right: "2px",
    },
    "& .MuiTablePagination-actions svg": { fill: "#64748B" },
    "& .MuiTablePagination-actions button": {
      borderRadius: "8px",
      transition: "background-color 0.15s ease",
      "&:hover": { backgroundColor: "rgba(100, 116, 139, 0.08)" },
    },

    // Editing row styles
    "& .MuiDataGrid-virtualScrollerRenderZone > div.MuiDataGrid-row.MuiDataGrid-row--editing":
      {
        backgroundColor: "#EFF6FF !important",
        transition: "all 200ms ease-in-out",
      },
    "& .MuiOutlinedInput-notchedOutline": {
      border: "1px solid #CBD5E1",
    },
    "&:hover .MuiOutlinedInput-notchedOutline": {
      border: "1px solid #94A3B8",
    },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      border: "2px solid #2563EB",
    },
    "& .MuiDataGrid-virtualScrollerRenderZone > div.MuiDataGrid-row.MuiDataGrid-row--editing .MuiDataGrid-cell":
      {
        backgroundColor: "transparent !important",
        color: "#0F172A !important",
      },

    // Save/Cancel row-edit actions - rounded pill + tinted hover, matching
    // every other row action (ui/Actions.tsx's actionIconSx). Targeted by
    // aria-label since GridActionsCellItem's MUI X v8 types don't expose
    // an `sx` prop to style these directly.
    '& button[aria-label="Save"]': {
      padding: "5px",
      borderRadius: "8px",
      color: "#059669",
      backgroundColor: "rgba(5, 150, 105, 0.06)",
      transition: "all 0.15s ease-in-out",
    },
    '& button[aria-label="Save"]:hover': {
      backgroundColor: "rgba(5, 150, 105, 0.12)",
    },
    '& button[aria-label="Cancel"]': {
      padding: "5px",
      borderRadius: "8px",
      color: "#E11D48",
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
    "& .MuiDataGrid-row.row-print-completed": {
      backgroundColor: "rgba(16, 185, 129, 0.05)",
    },
    "& .MuiDataGrid-row.row-print-completed:hover": {
      backgroundColor: "rgba(16, 185, 129, 0.1)",
    },
    "& .MuiDataGrid-row.row-print-completed.Mui-selected": {
      backgroundColor: "rgba(16, 185, 129, 0.15)",
    },

    // Accordion detail-panel row (see renderDetailPanel) - a plain content
    // area, not another data row, so it shouldn't pick up row hover/click
    // affordances. The checkbox column sits outside the columns we control
    // (MUI adds it internally for checkboxSelection), so isRowSelectable
    // only disables it - it still rendered a visible grayed-out checkbox.
    // Hiding it here removes it from view entirely instead.
    "& .MuiDataGrid-row.row-detail-panel": {
      backgroundColor: "#FAFBFC",
      cursor: "default",
    },
    "& .MuiDataGrid-row.row-detail-panel:hover": {
      backgroundColor: "#FAFBFC",
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
      backgroundColor: "#2563EB",
    },
  }),
  [],
);

  const apiRef = useGridApiRef();
  // Pull dialog methods once to avoid repeated getter calls.
  const { showDialog, closeDialog, setLoading } = useConfirmDialogStore();
  const { deleteProject, setSelectedProject, downloadProject, refreshProject } =
    useProjectStore();
  const [rowModesModel, setRowModesModel] = React.useState<GridRowModesModel>(
    {},
  );
  const [expandedRowId, setExpandedRowId] = React.useState<GridRowId | null>(
    null,
  );

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
      // Save/Cancel act immediately, no confirmation dialog - editing a row
      // is already an explicit, reversible-until-you-click-Save action, so
      // a second "are you sure?" step is just friction, not safety.
      //
      // apiRef.current is only null before the grid has mounted, which
      // can't happen here - this only runs after a user has already
      // clicked Edit/Save on a rendered row. Guard anyway rather than
      // asserting, so a stray call can't throw.
      if (!apiRef.current) return;
      apiRef.current.stopRowEditMode({
        id,
        ignoreModifications: false, // 🔥 THIS triggers processRowUpdate
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
    (id: GridRowId) => () => {
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
          const { start, update, finish } = useDownloadProgressStore.getState();
          start("Downloading project files…");
          try {
            const success = await downloadProject(id as string, update);
            // The backend flips `downloaded` on every file in the project as
            // part of serving the zip - refetch so the accordion file list
            // (and anyone else looking at this project) picks up the change.
            if (success) await refreshProject(id as string);
            onDownloadRef.current?.(id);
          } finally {
            finish();
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
        // GridActionsCellItem's typed props (MUI X v8) don't expose `sx` -
        // its underlying IconButton is styled here instead via the grid's
        // own sx block (see the "button[aria-label=...]" rules below),
        // matching the rounded-pill + tinted-hover treatment every other
        // row action already has (see ui/Actions.tsx's actionIconSx). The
        // old code put a hover sx on the *icon* prop instead of the button
        // - the icon isn't what receives the hover event, so it never did
        // anything.
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
          download: handleDownloadClick(params.id),
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
    // Inserted right after the expanded row (see handleRowClick) - the
    // first data column's colSpan grows to cover every column for just
    // this one synthetic row, so its renderCell can paint a single
    // full-width panel instead of the grid trying to lay this row out like
    // a normal one.
    const totalColumnSpan = columns.length + 1; // +1 for the appended "actions" column
    const dataColumns = renderDetailPanel
      ? columns.map((col, idx) => {
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
      : columns;

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
  }, [columns, getActions, actionsWidth, renderDetailPanel, rows]);

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

  // NOTE: there used to be an onCellClick handler here that unconditionally
  // set event.defaultMuiPrevented = true. MUI's grid checks that flag after
  // publishing "cellClick" and, if set, never publishes "rowClick" at all -
  // so handleRowClick below (and the accordion expand/select it drives)
  // silently never fired for a normal click anywhere in the row. Removed;
  // only cellDoubleClick still suppresses its default (blocks double-click
  // auto edit, which this app deliberately keeps explicit via the Edit
  // action).
  const handleRowClick = React.useCallback<GridEventListener<"rowClick">>(
    (params, event) => {
      // Don't trigger row selection if clicking on checkbox
      const target = event.target as HTMLElement;
      const isCheckbox =
        target.closest(".MuiCheckbox-root") ||
        target.closest('[data-field="__check__"]');

      if (isCheckbox) return;

      if (renderDetailPanel) {
        // Clicks land inside the detail panel too (it's rendered as this
        // row's content) - a click there hits the synthetic detail row's
        // id, not a real one, so this just no-ops instead of toggling.
        if ((params.row as any)?.__detailPanelFor !== undefined) return;
        setExpandedRowId((prev) => (prev === params.id ? null : params.id));
        setSelectedProject(params.row);
        return;
      }

      setSelectedProject(params.row);
    },
    [setSelectedProject, renderDetailPanel],
  );

  const preventDefaultCellDoubleClick = React.useCallback<
    GridEventListener<"cellDoubleClick">
  >((_params, event) => {
    event.defaultMuiPrevented = true;
  }, []);

  // Only used as the *uncontrolled* starting page size (client-mode tables
  // with no paginationModel prop, e.g. Employee/Billing) - server-mode
  // tables already control the displayed page size via their own
  // paginationModel prop, which takes precedence over this regardless.
  // Without it, MUI's uncontrolled default (100) wouldn't match our first
  // pageSizeOptions entry and would trigger its own console warning.
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
      {/* The rows-per-page dropdown's option list is a MUI Menu that
          portals straight to document.body, outside this component's DOM
          - a component-scoped sx (like gridSx below) can never reach it.
          It was rendering MUI's raw default elevation-8 shadow (a heavy,
          triple-layer Material shadow) while every other menu in the app
          (ui/Menu.tsx, ui/Actions.tsx's "more actions" menu) already
          overrides that to something much lighter. This targets only that
          unstyled default - anything with its own PaperProps/sx override
          (i.e. every other menu) already wins over a plain class rule. */}
      <GlobalStyles
        styles={{
          ".MuiPopover-paper.MuiMenu-paper.MuiPaper-elevation8": {
            boxShadow:
              "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
          },
          // Fades + slides the accordion panel's content in on mount. Only
          // opacity/transform are animated (never height) - those don't
          // affect layout, so the "auto" row-height measurement (see
          // getRowHeight below) stays correct on the very first frame
          // instead of racing an in-progress height animation, and it
          // can't fight the DataGrid virtualizer's own row positioning the
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
        // Without this, the grid fills whatever height its flex parent
        // computes and scrolls its rows in its own internal
        // .MuiDataGrid-virtualScroller - a second, separately-scrolling
        // region nested inside the page. That's why the table felt
        // "stuck"/heavy to scroll (touch and wheel gestures both have to
        // fight over which container owns the scroll) while the outer
        // page scrolled fine. autoHeight sizes the grid to exactly fit
        // its current page's rows instead, so there's only ever one
        // scroll surface - the page itself, which already scrolls
        // smoothly natively.
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
