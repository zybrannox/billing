import type { ReactNode } from "react";
import {
  Box,
  Typography,
  Button as MuiButton,
  IconButton,
  Paper,
  InputAdornment,
  Tooltip,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import CalculateRoundedIcon from "@mui/icons-material/CalculateRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";

import CopyButton from "../../ui/CopyButton";
import TextField from "../../ui/TextField";
import SearchSelect from "../../ui/SearchSelect";
import {
  newRow,
  copyRow,
  toNumber,
  sqFtOf,
  piecesOf,
  totalDisplayOf,
  minimumChargeOf,
  isMeasured,
  isOthersType,
  OTHERS_ITEM_TYPE,
  type ItemRow,
  type ItemTypeOption,
  type MeasurementUnit,
} from "./itemLineUtils";

// Shared line-item grid used by both the invoice and quotation creation
// forms (see features/billing/GenerateInvoice.tsx and GenerateQuotation.tsx) -
// a print/signage job is priced the same way whether it's a firm invoice
// or just an estimate (width x height => sq ft, at a per-sq-ft rate), so
// this is the one place that math and its UI live, rather than risking the
// two forms' item grids silently drifting apart over time.

const colHeaderSx = {
  fontWeight: 700,
  fontSize: "var(--fs-2xs)",
  letterSpacing: "0.05em",
  textTransform: "uppercase" as const,
  color: "var(--slate-500)",
  userSelect: "none" as const,
};

// The grid always fits its box, with no sideways scrolling (which used to hide
// the copy and delete buttons on most screens). All the columns fit on one line
// when there's room; below that a row wraps. It responds to the grid's own width
// rather than the screen's, since the dialogs around it vary.
//
// Width/Height also carry the unit toggle (ft/in) as an end adornment, and
// Rate/Total need room for real rupee amounts (e.g. "₹99,999.00").
const ONE_LINE_COLUMNS =
  "20px minmax(130px, 1.1fr) minmax(120px, 1.5fr) 96px 96px 86px 58px 96px 112px 60px";
const TWO_LINES = "@container (max-width: 979px)";
const STACKED = "@container (max-width: 559px)";

const rowLayoutSx = {
  display: "grid",
  columnGap: 1,
  rowGap: 1,
  alignItems: "center",
  gridTemplateColumns: ONE_LINE_COLUMNS,
  gridTemplateAreas: `"num type desc width height area pieces rate total actions"`,
  [TWO_LINES]: {
    alignItems: "end",
    gridTemplateColumns: "20px repeat(6, minmax(0, 1fr)) 60px",
    gridTemplateAreas: `
      "num type type desc desc desc desc actions"
      ". width height area pieces rate total total"`,
  },
  [STACKED]: {
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gridTemplateAreas: `
      "num num actions"
      "type type type"
      "desc desc desc"
      "width height pieces"
      "area rate rate"
      "total total total"`,
  },
};

// One field of a row. Its label only shows once the row has wrapped, when the
// fields no longer sit under the one-line column headers.
function Cell({ area, label, align, children }: { area: string; label: string; align?: "right"; children: ReactNode }) {
  return (
    <Box sx={{ gridArea: area, minWidth: 0 }}>
      <Typography
        sx={{
          ...colHeaderSx,
          display: "none",
          mb: 0.5,
          [TWO_LINES]: { display: "block" },
          ...(align ? { textAlign: align } : {}),
        }}
      >
        {label}
      </Typography>
      {children}
    </Box>
  );
}

// Numeric text input constraints preventing clipping and arrow overlapping
const numberFieldSx = {
  "& .MuiInputBase-root": {
    px: 0.75,
    height: 44,
    fontSize: "var(--fs-md)",
  },
  "& input": {
    textAlign: "right" as const,
    px: 0.25,
    py: 0.75,
  },
  "& input[type=number]": {
    MozAppearance: "textfield" as const,
  },
  "& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button": {
    WebkitAppearance: "none",
    margin: 0,
  },
  "& .MuiInputAdornment-root": {
    m: 0,
    "& .MuiTypography-root": {
      fontSize: "var(--fs-sm)",
      color: "var(--slate-500)",
      fontWeight: 600,
    },
  },
};

const textFieldSx = {
  "& .MuiInputBase-root": {
    px: 1,
    height: 44,
    fontSize: "var(--fs-md)",
  },
  "& input": {
    py: 0.75,
  },
};

interface ItemLineEditorProps {
  items: ItemRow[];
  onChange: (items: ItemRow[]) => void;
  itemTypeOptions: ItemTypeOption[];
}

// A native <select>, not the app's own Dropdown component - Dropdown is a
// full Autocomplete popup meant for a labeled field of its own, far too
// heavy to sit inside a number input's end adornment. Width and Height
// both read/write the same row.unit (one row is one physical
// measurement, not a width in feet paired with a height in inches), so
// changing either field's unit toggle changes both.
function UnitSelect({
  value,
  onChange,
}: {
  value: MeasurementUnit;
  onChange: (unit: MeasurementUnit) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as MeasurementUnit)}
      style={{
        border: "none",
        background: "transparent",
        fontSize: "var(--fs-sm)",
        fontWeight: 600,
        color: "var(--slate-500)",
        cursor: "pointer",
        outline: "none",
        fontFamily: "inherit",
        padding: 0,
      }}
    >
      <option value="ft">ft</option>
      <option value="in">in</option>
    </select>
  );
}

export default function ItemLineEditor({ items, onChange, itemTypeOptions }: ItemLineEditorProps) {
  const updateRow = (key: string, patch: Partial<ItemRow>) => {
    onChange(items.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  // Picking a catalog type re-syncs the rate to it, but leaves the
  // description alone - the description is often already meaningful, and
  // silently clobbering it just because a type was picked afterward would
  // throw that away.
  //
  // Custom text the catalog doesn't know keeps whatever rate is already there:
  // there's no catalog price to re-sync to, and it may well have been typed
  // first. Text that only differs in case is treated as the catalog entry.
  const handleItemTypeChange = (key: string, typed: string) => {
    const match = itemTypeOptions.find((o) => o.value.toLowerCase() === typed.toLowerCase());
    const value = match?.value ?? typed;
    const isCustom = value !== "" && !match;
    updateRow(key, {
      itemType: value,
      minCharges: match?.min_charges ?? null,
      ...(isCustom ? {} : { rate: match?.rate != null ? String(match.rate) : "" }),
      total: "",
      // An "Others" line has no dimensions - drop whatever was typed so a
      // stale width/height can't come back (and silently start counting
      // again) if the type is later switched back to a measured one.
      ...(isOthersType(value) ? { width: "", height: "" } : {}),
    });
  };

  // "Others" (billed by quantity, no area) is always offered, even when the
  // shop's own catalog doesn't list it - added last, and skipped if the
  // catalog already has an entry that means the same thing.
  const typeChoices = [
    ...itemTypeOptions.map((o) => o.value),
    ...(itemTypeOptions.some((o) => isOthersType(o.value)) ? [] : [OTHERS_ITEM_TYPE]),
  ];

  // Total Amount is editable, but the backend only ever persists Rate
  // (Width × Height × Rate × Pieces) - there's no separate "total" column
  // to save an override into. So typing a total here works by solving that
  // same equation backwards: Rate = Total ÷ (Area × Pieces). Only
  // meaningful once an area exists (the field is disabled with 0 area -
  // see the JSX), so this is never called with sqft <= 0. An "Others" line
  // has no area, so its equation is just Rate = Total ÷ Pieces.
  const handleTotalChange = (key: string, value: string) => {
    onChange(
      items.map((r) => {
        if (r.key !== key) return r;
        const area = isMeasured(r) ? sqFtOf(r) : 1;
        if (area <= 0) return r;
        const typed = toNumber(value);
        const derivedRate = Math.round((typed / (area * piecesOf(r))) * 1_000_000) / 1_000_000;
        return { ...r, total: value, rate: String(derivedRate) };
      })
    );
  };

  const addRow = () => onChange([...items, newRow()]);

  // Right below the original, where the small change usually made next is
  // easiest to see.
  const duplicateRow = (key: string) =>
    onChange(items.flatMap((r) => (r.key === key ? [r, copyRow(r)] : [r])));

  const removeRow = (key: string) =>
    onChange(items.length > 1 ? items.filter((r) => r.key !== key) : items);

  const totalSqFt = Math.round(items.reduce((sum, r) => sum + sqFtOf(r), 0) * 100) / 100;

  return (
    <>
      <Paper elevation={0} sx={{ border: "1px solid var(--slate-200)", borderRadius: 3, overflow: "hidden", mb: 2 }}>
        <Box sx={{ containerType: "inline-size" }}>
          <Box>
            {/* Table Header */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: ONE_LINE_COLUMNS,
                columnGap: 1,
                bgcolor: "var(--slate-50)",
                borderBottom: "1px solid var(--slate-200)",
                px: 1.5,
                py: 1.5,
                alignItems: "center",
                [TWO_LINES]: { display: "none" },
              }}
            >
              <Typography sx={colHeaderSx}>#</Typography>
              <Typography sx={colHeaderSx}>Item Type</Typography>
              <Typography sx={colHeaderSx}>Item Description</Typography>
              <Typography sx={{ ...colHeaderSx, textAlign: "right" }}>Width</Typography>
              <Typography sx={{ ...colHeaderSx, textAlign: "right" }}>Height</Typography>
              <Typography sx={{ ...colHeaderSx, textAlign: "right" }}>Area</Typography>
              <Typography sx={{ ...colHeaderSx, textAlign: "right" }}>Pieces</Typography>
              <Typography sx={{ ...colHeaderSx, textAlign: "right" }}>Rate</Typography>
              <Typography sx={{ ...colHeaderSx, textAlign: "right" }}>Total Amount</Typography>
              <Box />
            </Box>

            {/* Line Items Rows */}
            <Box>
              {items.map((row, idx) => (
                <Box
                  key={row.key}
                  sx={{
                    ...rowLayoutSx,
                    px: 1.5,
                    py: 1.25,
                    borderTop: idx === 0 ? "none" : "1px solid var(--slate-100)",
                    bgcolor: idx % 2 === 0 ? "var(--white)" : "var(--slate-50)",
                  }}
                >
                  <Typography variant="body2" sx={{ gridArea: "num", alignSelf: "center", color: "var(--slate-400)", fontWeight: 600, fontSize: "var(--fs-sm)" }}>
                    {idx + 1}
                  </Typography>

                  <Cell area="type" label="Item Type">
                    <SearchSelect
                      placeholder="Search or type"
                      freeSolo
                      options={typeChoices}
                      value={row.itemType || undefined}
                      onChange={(v) => handleItemTypeChange(row.key, (v as string) || "")}
                      sx={{ minWidth: 0, "& .MuiInputBase-root.MuiOutlinedInput-root": { minHeight: 44 } }}
                    />
                  </Cell>

                  <Cell area="desc" label="Item Description">
                    <TextField
                      placeholder="Item or Banner details"
                      value={row.description}
                      onChange={(e) => updateRow(row.key, { description: e.target.value })}
                      sx={textFieldSx}
                      fullWidth
                      slotProps={
                        row.pixelWidth && row.pixelHeight
                          ? {
                              input: {
                                endAdornment: (
                                  <InputAdornment position="end">
                                    <Tooltip title={`Source image is ${row.pixelWidth} × ${row.pixelHeight}px — enter the real print size in the fields to the right`}>
                                      <ImageRoundedIcon sx={{ fontSize: 16, color: "var(--slate-400)" }} />
                                    </Tooltip>
                                  </InputAdornment>
                                ),
                              },
                            }
                          : undefined
                      }
                    />
                  </Cell>
                  <Cell area="width" label="Width" align="right">
                    <TextField
                      type="number"
                      placeholder={isMeasured(row) ? "0" : "—"}
                      value={row.width}
                      onChange={(e) => updateRow(row.key, { width: e.target.value, total: "" })}
                      disabled={!isMeasured(row)}
                      sx={numberFieldSx}
                      slotProps={{
                        input: {
                          endAdornment: isMeasured(row) ? (
                            <InputAdornment position="end">
                              <UnitSelect value={row.unit} onChange={(unit) => updateRow(row.key, { unit, total: "" })} />
                            </InputAdornment>
                          ) : undefined,
                        },
                      }}
                    />
                  </Cell>

                  <Cell area="height" label="Height" align="right">
                    <TextField
                      type="number"
                      placeholder={isMeasured(row) ? "0" : "—"}
                      value={row.height}
                      onChange={(e) => updateRow(row.key, { height: e.target.value, total: "" })}
                      disabled={!isMeasured(row)}
                      sx={numberFieldSx}
                      slotProps={{
                        input: {
                          endAdornment: isMeasured(row) ? (
                            <InputAdornment position="end">
                              <UnitSelect value={row.unit} onChange={(unit) => updateRow(row.key, { unit, total: "" })} />
                            </InputAdornment>
                          ) : undefined,
                        },
                      }}
                    />
                  </Cell>

                  <Cell area="area" label="Area" align="right">
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--slate-700)", pr: 0.5, fontSize: "var(--fs-sm)", minHeight: 44, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.5, whiteSpace: "nowrap" }}>
                      {isMeasured(row) ? (
                        <>
                          {sqFtOf(row)}{" "}
                          <Typography component="span" sx={{ fontSize: "var(--fs-xs)", color: "var(--slate-500)", fontWeight: 500 }}>
                            sq ft
                          </Typography>
                        </>
                      ) : (
                        <Typography component="span" sx={{ color: "var(--slate-400)" }}>
                          —
                        </Typography>
                      )}
                    </Typography>
                  </Cell>

                  <Cell area="pieces" label="Pieces" align="right">
                    <TextField
                      type="number"
                      placeholder="1"
                      value={row.pieces}
                      onChange={(e) => updateRow(row.key, { pieces: e.target.value, total: "" })}
                      sx={numberFieldSx}
                      slotProps={{ htmlInput: { min: 1, step: 1 } }}
                    />
                  </Cell>

                  <Cell area="rate" label="Rate" align="right">
                    {row.total !== "" ? (
                      <Tooltip title="Rate is hidden because Total was entered directly for this item - click to enter a rate instead">
                        <Box
                          onClick={() => updateRow(row.key, { total: "" })}
                          sx={{
                            height: 40,
                            px: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: 0.5,
                            borderRadius: "8px",
                            border: "1px dashed var(--slate-300)",
                            bgcolor: "var(--slate-50)",
                            color: "var(--slate-400)",
                            cursor: "pointer",
                            "&:hover": { borderColor: "var(--slate-400)", color: "var(--slate-500)", bgcolor: "var(--slate-100)" },
                          }}
                        >
                          <VisibilityOffRoundedIcon sx={{ fontSize: 15 }} />
                          <Typography sx={{ fontSize: "var(--fs-xs)", fontWeight: 600, fontStyle: "italic" }}>
                            Hidden
                          </Typography>
                        </Box>
                      </Tooltip>
                    ) : (
                      <TextField
                        type="number"
                        placeholder="0.00"
                        value={row.rate}
                        onChange={(e) => updateRow(row.key, { rate: e.target.value, total: "" })}
                        sx={numberFieldSx}
                        slotProps={{
                          input: {
                            startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                          },
                        }}
                      />
                    )}
                  </Cell>

                  <Cell area="total" label="Total Amount" align="right">
                    <Tooltip
                      title={
                        isMeasured(row) && sqFtOf(row) <= 0
                          ? "Enter Width and Height first"
                          : minimumChargeOf(row) !== null
                            ? "Minimum charge for this size. Type a different total to change it."
                            : ""
                      }
                    >
                      <span>
                        <TextField
                          type="number"
                          placeholder="0.00"
                          value={totalDisplayOf(row)}
                          onChange={(e) => handleTotalChange(row.key, e.target.value)}
                          disabled={isMeasured(row) && sqFtOf(row) <= 0}
                          sx={{
                            ...numberFieldSx,
                            "& .MuiInputBase-input.Mui-disabled": {
                              WebkitTextFillColor: "var(--slate-400)",
                            },
                            ...(minimumChargeOf(row) !== null
                              ? {
                                  "& .MuiInputBase-root": { ...numberFieldSx["& .MuiInputBase-root"], bgcolor: "var(--blue-50)" },
                                  "& .MuiInputAdornment-root .MuiTypography-root": { fontSize: "var(--fs-2xs)", fontWeight: 700, color: "var(--blue-700)" },
                                }
                              : {}),
                          }}
                          slotProps={{
                            htmlInput: minimumChargeOf(row) !== null ? { "aria-label": "Total amount, minimum charge applied" } : undefined,
                            input: {
                              startAdornment: <InputAdornment position="start">{minimumChargeOf(row) !== null ? "MIN" : "₹"}</InputAdornment>,
                            },
                          }}
                        />
                      </span>
                    </Tooltip>
                  </Cell>

                  <Box sx={{ gridArea: "actions", alignSelf: "center", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                    <CopyButton label="Copy item" onClick={() => duplicateRow(row.key)} />
                    <Tooltip title={items.length === 1 ? "Minimum 1 item required" : "Remove item"}>
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => removeRow(row.key)}
                          disabled={items.length === 1}
                          sx={{
                            color: "var(--slate-400)",
                            "&:hover": { color: "var(--red-500)", bgcolor: "var(--red-50)" },
                            "&.Mui-disabled": { opacity: 0.3 },
                          }}
                        >
                          <DeleteRoundedIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Row Control & Quick Calculations */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <MuiButton
          size="medium"
          startIcon={<AddRoundedIcon />}
          onClick={addRow}
          disableRipple
          sx={{
            textTransform: "none",
            fontWeight: 600,
            color: "var(--blue-600)",
            bgcolor: "var(--blue-50)",
            px: 2,
            py: 0.8,
            borderRadius: 2,
            "&:hover": { bgcolor: "var(--blue-100)" },
          }}
        >
          Add Item Line
        </MuiButton>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "var(--slate-500)" }}>
          <CalculateRoundedIcon fontSize="small" />
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Total Printable Area: <strong>{totalSqFt} sq ft</strong>
          </Typography>
        </Box>
      </Box>
    </>
  );
}
