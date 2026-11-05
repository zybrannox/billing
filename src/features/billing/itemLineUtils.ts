// Plain helpers/types for ItemLineEditor.tsx, split into their own file so
// that component file only exports the component (react-refresh's
// only-export-components rule requires this for fast refresh to work).

import { messages } from "../../messages";

export type MeasurementUnit = "ft" | "in";

export interface ItemRow {
  key: string;
  itemType: string;
  description: string;
  width: string;
  height: string;
  // The unit Width/Height are entered in - not every job is naturally
  // measured in feet (a name board is more usefully "18in x 6in" than
  // "1.5ft x 0.5ft"). Rate always stays per square foot regardless (see
  // sqFtOf's 144 sq-in/sq-ft conversion for "in"), matching how this shop
  // actually prices work - this only changes what width/height mean, not
  // how the total is billed.
  unit: MeasurementUnit;
  rate: string;
  // How many identical pieces this line bills for (e.g. 10 identical name
  // boards at the same size/rate) - multiplies straight into the total
  // (see totalOf), so a line for multiple pieces doesn't need N separate
  // rows. Expected to be a positive whole number as a string; an invalid
  // value (blank, 0, negative, fractional) is caught at submit time (see
  // GenerateInvoice.tsx/GenerateQuotation.tsx's row validation) rather
  // than silently coerced - piecesOf() below only exists to give live
  // calculations (totals shown while still typing) a safe value to work
  // with, not to paper over a bad final value.
  pieces: string;
  // Raw override for the Total Amount field, typed directly by the user -
  // "" means "not overridden, just show rate × area × pieces" (see
  // totalDisplayOf below). Editing Width/Height/Rate/Pieces clears this
  // back to "" so an old override never silently lingers and disagrees
  // with the inputs that actually drive it; editing Total itself sets
  // this AND back-derives Rate (the field the backend actually persists)
  // to match, so the two never disagree on submit.
  total: string;
  pixelWidth: number | null;
  pixelHeight: number | null;
  // The uploaded file this line was started from (a ProjectFile id), so the
  // invoice can later show exactly the files it billed for. null for lines
  // typed by hand.
  projectFileId: number | null;
  // The picked item type's minimum charges by size, if it has any. Only set by
  // picking a type: lines reopened from a saved invoice don't record theirs, so
  // correcting one never quietly changes what was already agreed.
  minCharges?: MinCharge[] | null;
}

export interface MinCharge {
  up_to_sq_ft: number;
  amount: number;
}

// The one built-in item type that isn't priced by area - a service charge,
// an accessory, anything billed as "N of these at ₹X". Always offered in the
// type picker (see ItemLineEditor) whether or not the shop's own catalog
// lists it, and matched case-insensitively ("Other"/"Others") so a catalog
// entry someone already created keeps working the same way.
export const OTHERS_ITEM_TYPE = "Others";

export const isOthersType = (itemType: string) => {
  const t = itemType.trim().toLowerCase();
  return t === "others" || t === "other";
};

// Measured rows (the default, and everything that existed before "Others")
// are billed width x height x rate x pieces; an "Others" row has no
// width/height/area at all and bills rate x pieces.
export const isMeasured = (row: ItemRow) => !isOthersType(row.itemType);

export interface ItemTypeOption {
  id: number;
  value: string;
  rate: number | null;
  min_charges?: MinCharge[] | null;
}

let rowCounter = 0;
export const newRow = (
  description = "",
  pixelWidth: number | null = null,
  pixelHeight: number | null = null,
  projectFileId: number | null = null
): ItemRow => ({
  key: `row-${++rowCounter}`,
  itemType: "",
  description,
  width: "",
  height: "",
  unit: "ft",
  rate: "",
  pieces: "1",
  total: "",
  pixelWidth,
  pixelHeight,
  projectFileId,
});

// An identical line under a new key, for the many jobs where lines differ by
// only a size or a piece count. Keeps its link to the uploaded file, since it's
// still billing that same artwork.
export const copyRow = (row: ItemRow): ItemRow => ({ ...row, key: `row-${++rowCounter}` });

export const toNumber = (v: string): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Always at least 1 - an empty or zero Pieces field means "one piece",
// never "bill for nothing".
export const piecesOf = (row: ItemRow) => Math.max(1, Math.trunc(toNumber(row.pieces)) || 1);

// width x height in square inches -> square feet: 12in x 12in = 1 sq ft,
// so divide by 144 - the standard print-industry conversion, mirrored
// server-side in app/invoices/calculations.py's compute_line (the actual
// source of truth for what gets billed; this copy only drives the live
// total shown while still typing).
const SQ_IN_PER_SQ_FT = 144;

export const sqFtOf = (row: ItemRow) => {
  if (!isMeasured(row)) return 0;
  if (!row.width || !row.height) return 0;
  const rawArea = toNumber(row.width) * toNumber(row.height);
  const sqFt = row.unit === "in" ? rawArea / SQ_IN_PER_SQ_FT : rawArea;
  return Math.round(sqFt * 100) / 100;
};

const rateTotalOf = (row: ItemRow) =>
  Math.round((isMeasured(row) ? sqFtOf(row) : 1) * toNumber(row.rate) * piecesOf(row) * 100) / 100;

// The minimum this line must charge, when that's more than its rate would come
// to; null when the rate applies. Size is the whole line (area x pieces), since
// pieces run together. A total typed by hand always wins, and a rate of exactly
// 0 is a deliberate free item, so neither is raised.
export const minimumChargeOf = (row: ItemRow): number | null => {
  if (!row.minCharges?.length || !isMeasured(row) || row.total !== "") return null;
  const sqFt = sqFtOf(row);
  if (sqFt <= 0) return null;
  if (row.rate.trim() !== "" && toNumber(row.rate) === 0) return null;
  const size = sqFt * piecesOf(row);
  const tier = [...row.minCharges].sort((a, b) => a.up_to_sq_ft - b.up_to_sq_ft).find((t) => size <= t.up_to_sq_ft);
  return tier && tier.amount > rateTotalOf(row) ? tier.amount : null;
};

// The real, authoritative total (rate × area × pieces, or the minimum charge
// when that's higher) - used for every actual sum (grand total, submission
// payload, etc). Derived from rate, never from row.total directly, so a manual
// Total override can never silently drift from what's actually billed: editing
// Total back-derives rate (see ItemLineEditor's handleTotalChange), and this
// recomputes from that updated rate.
export const totalOf = (row: ItemRow) => minimumChargeOf(row) ?? rateTotalOf(row);

// Whether a row has enough filled in to compute a total from - an area for a
// measured row, a rate for an "Others" row (which has no area to wait for).
export const canComputeTotal = (row: ItemRow) =>
  isMeasured(row) ? sqFtOf(row) > 0 : row.rate.trim() !== "" || row.total !== "";

// What the Total Amount field itself should show: the user's raw typed
// override while they're actively editing it, or the live computed value
// otherwise. Never reformats an in-progress override (no toFixed on every
// keystroke) - doing that here would re-inject extra characters mid-type
// and corrupt whatever the user is entering.
//
// Gated on sqFtOf(row) > 0, not on totalOf(row) itself - a free item
// (Rate = 0, explicitly allowed - see GenerateInvoice.tsx's row
// validation) legitimately computes a total of exactly 0, and 0 is falsy
// in JS, so checking totalOf(row) directly used to blank the field for
// any free item instead of showing "0.00". Checking the area instead
// (same condition ItemLineEditor.tsx already disables this field on)
// only blanks it when there's genuinely no width/height yet to compute
// from.
export const totalDisplayOf = (row: ItemRow) =>
  row.total !== "" ? row.total : canComputeTotal(row) ? totalOf(row).toFixed(2) : "";

export type RowCheck = "empty" | "ok" | "invalid";

// Shared by the Create Invoice, Create Quotation and Edit Invoice forms'
// submit validation, which each used to carry their own identical copy.
// "empty" rows are silently skipped (an untouched placeholder line); an
// "invalid" one blocks submit with invalidRowMessage below.
export const checkRow = (row: ItemRow): RowCheck => {
  const piecesOk = Number.isInteger(toNumber(row.pieces)) && toNumber(row.pieces) >= 1;

  if (!isMeasured(row)) {
    const hasRate = row.rate.trim() !== "";
    if (!hasRate && row.description.trim() === "") return "empty";
    return hasRate && toNumber(row.rate) >= 0 && piecesOk ? "ok" : "invalid";
  }

  const filled = [row.width, row.height, row.rate].filter((v) => v.trim() !== "");
  if (filled.length === 0) return "empty";
  // A minimum charge prices the line, so it doesn't need a rate as well.
  return (filled.length === 3 || minimumChargeOf(row) !== null) &&
    toNumber(row.width) > 0 &&
    toNumber(row.height) > 0 &&
    toNumber(row.rate) >= 0 &&
    piecesOk
    ? "ok"
    : "invalid";
};

export const invalidRowMessage = (row: ItemRow) =>
  isMeasured(row)
    ? "Each item needs a valid width, height, and rate (rate can be 0, dimensions must be > 0), and a whole number of pieces (1 or more)."
    : "Each “Others” item needs a rate (can be 0) and a whole number of pieces (1 or more).";

// The request body for one line, shared by the same three forms. An
// "Others" row sends has_dimensions: false and no width/height (the backend
// stores 0 for both and bills rate x pieces - see compute_line).
//
// The item type itself isn't stored - only the description is - so with no
// description the type is what names the line on the document, rather than it
// printing as "Standard Item". "Others" says nothing useful, so it's left out.
//
// A minimum charge goes the same way as a total typed by hand: the backend only
// stores a rate, so it gets the rate that comes to exactly that amount, marked
// so the document shows the amount rather than an odd-looking rate.
export const rowToItemPayload = (r: ItemRow) => {
  const minimum = minimumChargeOf(r);
  return {
    description: r.description.trim() || (isOthersType(r.itemType) ? "" : r.itemType.trim()) || undefined,
    ...(isMeasured(r)
      ? { width: toNumber(r.width), height: toNumber(r.height) }
      : { has_dimensions: false }),
    unit: r.unit,
    rate: minimum !== null ? Math.round((minimum / (sqFtOf(r) * piecesOf(r))) * 1_000_000) / 1_000_000 : toNumber(r.rate),
    pieces: piecesOf(r),
    is_manual_total: minimum !== null || r.total !== "",
    ...(r.projectFileId != null ? { project_file_id: r.projectFileId } : {}),
  };
};

export const subtotalOf = (rows: ItemRow[]) => Math.round(rows.reduce((sum, r) => sum + totalOf(r), 0) * 100) / 100;

// The lines a form should submit: untouched placeholders are dropped, and the
// first invalid line (or having no lines at all) comes back as the error to show.
export const collectRows = (items: ItemRow[]): { rows: ItemRow[]; error: string | null } => {
  const rows: ItemRow[] = [];
  for (const row of items) {
    const check = checkRow(row);
    if (check === "invalid") return { rows: [], error: invalidRowMessage(row) };
    if (check === "ok") rows.push(row);
  }
  return { rows, error: rows.length === 0 ? messages.errors.addAtLeastOneItem : null };
};
