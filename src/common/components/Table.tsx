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
} from "@mui/x-data-grid";
import React from "react";
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
  onDelete?: (id: GridRowId) => void;
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
}: TableProps<T>) {
  // Memoize SX to avoid creating a new object on every render
  const gridSx = React.useMemo(
    () => ({
      borderRadius: "var(--border-radius-lg)",
      color: "#000",
      boxShadow: "0 0 15px rgba(255, 255, 255, 0.2)",
      border: "none",
      "--DataGrid-rowBorderColor": "var(--border-color)",
      "& .MuiCheckbox-root": { color: "var(--blue-300) !important" },
      "& .MuiDataGrid-main": {
        borderTopLeftRadius: "var(--border-radius-sm)",
        borderTopRightRadius: "var(--border-radius-sm)",
        overflow: "hidden",
      },
      "& .MuiDataGrid-columnHeader .MuiDataGrid-columnHeaderTitleContainer .MuiCheckbox-root":
        {
          color: "var(--blue-800) !important",
        },
      "& .MuiDataGrid-columnHeader .Mui-checked": {
        color: "var(--blue-600) !important",
      },
      "& .Mui-checked": {
        color: "var(--blue-800) !important",
      },
      "& .MuiCheckbox-root:hover": {
        backgroundColor: "rgba(255,255,255,0.1) !important",
      },
      "& .Mui-focusVisible": { outline: "none" },
      "& .MuiDataGrid-row:last-of-type": {
        borderBottom: "1px solid var(--DataGrid-rowBorderColor)",
      },
      "& .MuiDataGrid-row.Mui-selected": {
        backgroundColor: "var(--white-10)",
      },
      "& .MuiDataGrid-row.Mui-selected:hover": {
        backgroundColor: "var(--white-20)",
      },
      "& .MuiDataGrid-row:hover": { backgroundColor: "transparent" },
      "& .MuiDataGrid-columnHeader": { color: "#000" },
      "& .MuiDataGrid-columnHeaderTitle": {
        color: "var(--blue-800)",
        fontWeight: 700,
        fontSize: "0.8rem",
        textTransform: "uppercase",
      },
      "& .MuiDataGrid-columnHeaders": {
        backgroundColor: "#ffffff",
      },
      "& .MuiDataGrid-footerContainer": {
        borderTop: "none !important",
        // backgroundImage: "var(--blue-gradient)",
        // backgroundColor:"var(--blue-100)"
      },
      "& .MuiDataGrid-footerContainer .MuiDataGrid-pagination": {
        borderTop: "none !important",
        color: "var(--admin-text-white)",
      },
      "& .MuiTablePagination-title": { color: "#fff" },
      "& .MuiTablePagination-displayedRows": { color: "#fff" },
      "& .MuiTablePagination-selectLabel": { color: "#fff" },
      "& .MuiTablePagination-select": { color: "#fff" },
      "& .MuiTablePagination-actions svg": { fill: "#fff" },
      "& .MuiDataGrid-virtualScroller": {
        // paddingBottom: "10px",
      },
      // Highest-specificity selector for editing row
      "& .MuiDataGrid-virtualScrollerRenderZone > div.MuiDataGrid-row.MuiDataGrid-row--editing":
        {
          backgroundColor: "var(--blue-100) !important",
          transition: "all 300ms ease-out",
          color: "#fff !important",
        },
      "& .MuiDataGrid-virtualScrollerRenderZone > div.MuiDataGrid-row.MuiDataGrid-row--editing:hover":
        {
          backgroundColor: "var(--white-10) !important",
        },
      "& .MuiOutlinedInput-notchedOutline": {
        border: "none",
      },
      "&:hover .MuiOutlinedInput-notchedOutline": {
        border: "none",
      },
      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
        border: "none",
      },
      // Also fix each cell inside edit row (needed in dark themes)
      "& .MuiDataGrid-virtualScrollerRenderZone > div.MuiDataGrid-row.MuiDataGrid-row--editing .MuiDataGrid-cell":
        {
          backgroundColor: "var(--white-20) !important",
          color: "#fff !important",
        },

      "& .MuiDataGrid-footerContainer .MuiTablePagination-root": {
        color: "#000",
      },

      "& .MuiDataGrid-footerContainer .MuiTablePagination-displayedRows": {
        color: "#000",
      },

      "& .MuiDataGrid-footerContainer .MuiTablePagination-selectLabel": {
        color: "#000",
      },

      "& .MuiDataGrid-footerContainer .MuiTablePagination-select": {
        color: "#000",
      },

      "& .MuiDataGrid-footerContainer .MuiTablePagination-actions svg": {
        fill: "#000",
      },
      // If Print Status is set to Completed makes the row green
      "& .MuiDataGrid-row.row-print-completed": {
        backgroundColor: "rgba(46, 125, 50, 0.15)", // soft green
      },

      "& .MuiDataGrid-row.row-print-completed:hover": {
        backgroundColor: "rgba(46, 125, 50, 0.25)",
      },

      "& .MuiDataGrid-row.row-print-completed.Mui-selected": {
        backgroundColor: "rgba(46, 125, 50, 0.35)",
      },
    }),
    [],
  );

  const apiRef = useGridApiRef();
  // Pull dialog methods once to avoid repeated getter calls.
  const { showDialog, closeDialog, setLoading } = useConfirmDialogStore();
  const { deleteProject, setSelectedProject, downloadProject } =
    useProjectStore();
  const [rowModesModel, setRowModesModel] = React.useState<GridRowModesModel>(
    {},
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
      showDialog({
        title: "Save Changes?",
        description: "Do you want to update this record?",
        confirmText: "Save",
        onConfirm: () => {
          apiRef.current.stopRowEditMode({
            id,
            ignoreModifications: false, // 🔥 THIS triggers processRowUpdate
          });
          closeDialog();
        },
      });
    },
    [apiRef, showDialog, closeDialog],
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
          await deleteProject(id as string);
          onDeleteRef.current?.(id);
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
            await downloadProject(id as string, update);
            onDownloadRef.current?.(id);
          } finally {
            finish();
          }
        },
      });
    },
    [showDialog, closeDialog, downloadProject], // include deleteProject here
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
        description: `Do you want to ${
          isActive ? "deactivate" : "activate"
        } this item?`,
        confirmText: isActive ? "Deactivate" : "Activate",
        onConfirm: async () => {
          setLoading(true);

          // setData((prev) =>
          //   prev.map((item) =>
          //     item.id === id ? { ...item, isActive: !isActive } : item
          //   )
          // );

          onToggleRef.current?.(id, !isActive);

          setLoading(false);
          closeDialog();
        },
      });
    },
    [showDialog, closeDialog, setLoading],
  );

  // getActions separated and memoized to avoid regenerating entire columns array

  const getActions = React.useCallback(
    (params: GridRowParams) => {
      const isEditing = rowModesModel[params.id]?.mode === GridRowModes.Edit;

      if (isEditing) {
        return [
          <GridActionsCellItem
            key="save"
            icon={<SaveIcon />}
            label="Save"
            onClick={handleSaveClick(params.id)}
          />,
          <GridActionsCellItem
            key="cancel"
            icon={<CancelIcon />}
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
    return [
      ...columns,
      {
        field: "actions",
        type: "actions",
        headerName: "Actions",
        width: 160,
        getActions,
      },
    ];
  }, [columns, getActions]);
  return (
    <div
      style={{
        boxShadow: "0 0 15px rgba(255, 255, 255, 0.2)",
        borderRadius: "12px",
        overflow: "visible", // allow shadow to show
      }}
      className="w-full overflow-x-auto rounded-x"
    >
      <DataGrid<T>
        apiRef={apiRef}
        rows={rows}
        columns={mergedColumns}
        getRowId={(row) => row.id}
        sx={gridSx}
        disableRowSelectionOnClick
        initialState={initialState}
        disableColumnFilter
        checkboxSelection={checkboxSelection??false}
        rowSelectionModel={{
          type: "include",
          ids: new Set(rowSelectionModel || []),
        }}
        onRowSelectionModelChange={(
          newSelectionModel: GridRowSelectionModel,
        ) => {
          if (onSelectionChange) {
            if (newSelectionModel.type === "include") {
              onSelectionChange(Array.from(newSelectionModel.ids));
            } else {
              // Handle "exclude" (Project everything except these IDs)
              const excludedIds = newSelectionModel.ids;
              const selectedIds = rows
                .map((r) => r.id)
                .filter((id) => !excludedIds.has(id));
              onSelectionChange(selectedIds as GridRowId[]);
            }
          }
        }}
        editMode="row" // enable editing
        rowModesModel={rowModesModel}
        onRowModesModelChange={setRowModesModel}
        processRowUpdate={processRowUpdate}
        getRowClassName={getRowClassName}
        onRowEditStop={(params, event) => {
          // 🔒 Prevent auto save on focus loss
          if (params.reason === "rowFocusOut") {
            event.defaultMuiPrevented = true;
          }
        }}
        onProcessRowUpdateError={(error) => {
          console.error(error);
        }}
        onRowClick={(params, event) => {
          // Don't trigger row selection if clicking on checkbox
          const target = event.target as HTMLElement;
          const isCheckbox =
            target.closest(".MuiCheckbox-root") ||
            target.closest('[data-field="__check__"]');

          if (!isCheckbox) {
            setSelectedProject(params.row);
          }
        }}
        onCellDoubleClick={(params, event) => {
          event.defaultMuiPrevented = true;
        }}
        onCellClick={(params, event) => {
          event.defaultMuiPrevented = true;
        }}
        pageSizeOptions={[10]}
      />
    </div>
  );
}
