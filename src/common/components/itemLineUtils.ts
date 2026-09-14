// Plain helpers/types for ItemLineEditor.tsx, split into their own file so
// that component file only exports the component (react-refresh's
// only-export-components rule requires this for fast refresh to work).

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
}

export interface ItemTypeOption {
  id: number;
  value: string;
  rate: number | null;
}

let rowCounter = 0;
export const newRow = (
  description = "",
  pixelWidth: number | null = null,
  pixelHeight: number | null = null
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
});

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
  if (!row.width || !row.height) return 0;
  const rawArea = toNumber(row.width) * toNumber(row.height);
  const sqFt = row.unit === "in" ? rawArea / SQ_IN_PER_SQ_FT : rawArea;
  return Math.round(sqFt * 100) / 100;
};

// The real, authoritative total (rate × area × pieces) - used for every
// actual sum (grand total, submission payload, etc). Always derived from
// rate, never from row.total directly, so a manual Total override can
// never silently drift from what's actually billed: editing Total
// back-derives rate (see ItemLineEditor's handleTotalChange), and this
// recomputes from that updated rate.
export const totalOf = (row: ItemRow) =>
  Math.round(sqFtOf(row) * toNumber(row.rate) * piecesOf(row) * 100) / 100;

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
  row.total !== "" ? row.total : sqFtOf(row) > 0 ? totalOf(row).toFixed(2) : "";
