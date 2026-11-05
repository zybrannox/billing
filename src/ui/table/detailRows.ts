import type { GridRowId } from "@mui/x-data-grid";

// An accordion's open panel is a synthetic row spliced in under its parent: the
// Community DataGrid has no detail-panel feature of its own.
export interface DetailRow {
  id: string;
  __detailPanelFor: GridRowId;
}

export const isDetailRow = (row: unknown): row is DetailRow =>
  typeof row === "object" && row !== null && (row as Partial<DetailRow>).__detailPanelFor !== undefined;

// Rows with the expanded one's panel right after it. Only ever one at a time.
export function withDetailRow<T extends { id: GridRowId }>(rows: readonly T[], expandedId: GridRowId): (T | DetailRow)[] {
  return rows.flatMap((row) =>
    row.id === expandedId ? [row, { id: `${row.id}__detail`, __detailPanelFor: row.id }] : [row],
  );
}
