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
  type GridRenderCellParams,
  type GridRowHeightParams,
} from "@mui/x-data-grid";
import React from "react";
import GlobalStyles from "@mui/material/GlobalStyles";
import { useProjectStore } from "../store/useProjectStore";
import { GridRowModes, type GridRowModesModel } from "@mui/x-data-grid";
import { isDetailRow, withDetailRow } from "./table/detailRows";
import { buildGridSx } from "./table/gridStyles";
import { useRowActions, type RowActionHandlers } from "./table/useRowActions";

interface TableProps<T extends GridRowModel> {
  rows: GridRowsProp<T>;
  columns: GridColDef<T>[];
  processRowUpdate?: (newRow: T, oldRow: T) => Promise<T>;
  getRowClassName?: (params: GridRowClassNameParams<T>) => string;
  renderActions?: (params: GridRowParams, handlers: RowActionHandlers) => React.ReactElement[];
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
  // Drop the grid's own border and corners when it sits inside a card/panel
  // that already provides them.
  bare?: boolean;
}

export default function Table<T extends GridRowModel>({
  rows,
  columns,
  processRowUpdate,
  getRowClassName,
  renderActions,
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
  bare = false,
}: TableProps<T>) {
const gridSx = React.useMemo(
    () => buildGridSx({ bare, clickable: !!(onRowSelect || renderDetailPanel) }),
    [onRowSelect, renderDetailPanel, bare],
  );

  const apiRef = useGridApiRef();
  const setSelectedProject = useProjectStore((state) => state.setSelectedProject);
  const [rowModesModel, setRowModesModel] = React.useState<GridRowModesModel>(
    {},
  );
  const [internalExpandedRowId, setExpandedRowId] = React.useState<GridRowId | null>(
    null,
  );
  // See the expandedRowId prop's doc comment - controlled when the caller
  // passes it, otherwise Table's own click-driven state (unchanged).
  const expandedRowId = expandedRowIdProp !== undefined ? expandedRowIdProp : internalExpandedRowId;

  const getActions = useRowActions({
    apiRef,
    rowModesModel,
    setRowModesModel,
    renderActions,
    onDelete,
    onDownload,
    onEdit,
    onCancel,
    onToggle,
  });

  const mergedColumns: GridColDef[] = React.useMemo(() => {
    const totalColumnSpan = columns.length + 1;
    const editableColumns = columns.map((col) => {
      // Plain string/number columns with no custom renderCell/valueFormatter
      // of their own (e.g. a blank contact_number or email) render as an
      // empty cell by default - easy to misread as "still loading" rather
      // than "no data". Columns that already carry their own formatting
      // (singleSelect's valueOptions label mapping, payment_status's Chip
      // renderCell, etc.) are left untouched so this doesn't clobber them.
      const needsEmptyDash =
        !col.renderCell &&
        !col.valueFormatter &&
        (col.type === undefined || col.type === "string" || col.type === "number");
      return {
        ...col,
        editable: col.editable ?? Boolean(processRowUpdate),
        ...(needsEmptyDash
          ? {
              valueFormatter: (value: unknown) =>
                value === null || value === undefined || value === "" ? "-" : value,
            }
          : {}),
      };
    });
    const dataColumns = renderDetailPanel
      ? editableColumns.map((col, idx) => {
        if (idx !== 0) return col;
        return {
          ...col,
          colSpan: ((_value: unknown, row: unknown) =>
            isDetailRow(row) ? totalColumnSpan : undefined) as GridColDef["colSpan"],
          renderCell: (params: GridRenderCellParams) => {
            if (isDetailRow(params.row)) {
              const parentId = params.row.__detailPanelFor;
              const parentRow = rows.find((r) => r.id === parentId);
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
    return withDetailRow(rows as readonly (T & { id: GridRowId })[], expandedRowId);
  }, [rows, renderDetailPanel, expandedRowId]);

  // "auto" measures the panel's actual rendered content height instead of
  // guessing a fixed number - correct regardless of what a given
  // renderDetailPanel puts in it, and it's a genuine Community-edition
  // DataGrid feature (unlike the Pro-only detail-panel API this whole
  // accordion is standing in for).
  const getRowHeight = React.useCallback(
    (params: GridRowHeightParams) => (isDetailRow(params.model) ? "auto" : null),
    [],
  );

  const isRowSelectable = React.useCallback(
    (params: GridRowParams) => !isDetailRow(params.row),
    [],
  );

  const wrappedGetRowClassName = React.useCallback(
    (params: GridRowClassNameParams<T>) => {
      if (isDetailRow(params.row)) return "row-detail-panel";
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
      if (isDetailRow(params.row)) return;

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
