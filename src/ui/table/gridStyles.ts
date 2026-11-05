// How every data table in the app looks. `bare` drops the grid's own border and
// corners when it sits inside a card that already provides them; `clickable`
// shows a pointer over rows that respond to a click.
export const buildGridSx = ({ bare, clickable }: { bare: boolean; clickable: boolean }) => ({
    borderRadius: bare ? 0 : "12px",
    color: "var(--slate-900)",
    boxShadow: "none",
    border: bare ? "none" : "1px solid var(--slate-200)",
    backgroundColor: "var(--white)",
    "--DataGrid-rowBorderColor": "var(--slate-100)",

    ...(clickable
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
      fontSize: "var(--fs-xs)",
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
    "& .MuiTablePagination-selectLabel": { color: "var(--slate-600)", fontSize: "var(--fs-sm)" },
    // Minimal, matching the pagination prev/next buttons right next to it
    // (transparent by default, a soft hover pill, no persistent border/box)
    // rather than a fully outlined input - this is a footer control, not a
    // form field.
    "& .MuiTablePagination-select": {
      display: "flex",
      alignItems: "center",
      color: "var(--slate-700)",
      fontSize: "var(--fs-sm)",
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
});
