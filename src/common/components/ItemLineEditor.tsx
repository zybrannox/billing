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

import TextField from "../../ui/TextField";
import Dropdown from "../../ui/Dropdown";
import {
  newRow,
  toNumber,
  sqFtOf,
  piecesOf,
  totalDisplayOf,
  type ItemRow,
  type ItemTypeOption,
  type MeasurementUnit,
} from "./itemLineUtils";

// Shared line-item grid used by both the invoice and quotation creation
// forms (see common/pages/GenerateInvoice.tsx and GenerateQuotation.tsx) -
// a print/signage job is priced the same way whether it's a firm invoice
// or just an estimate (width x height => sq ft, at a per-sq-ft rate), so
// this is the one place that math and its UI live, rather than risking the
// two forms' item grids silently drifting apart over time.

const colHeaderSx = {
  fontWeight: 700,
  fontSize: "0.725rem",
  letterSpacing: "0.05em",
  textTransform: "uppercase" as const,
  color: "var(--slate-500)",
  userSelect: "none" as const,
};

// Precise grid layout preventing column drift and layout breaks. Every
// fixed column is sized for its actual content at the larger 44px/0.9rem
// field size below (not just squeezed to the minimum a bare number input
// needs) - Width/Height also carry the unit toggle (ft/in) as an end
// adornment, and Rate/Total need room for real rupee amounts (e.g.
// "₹99,999.00"), not just single-digit examples.
const ITEM_ROW_GRID = "28px 170px minmax(180px, 1fr) 130px 130px 100px 80px 130px 140px 36px";

// Numeric text input constraints preventing clipping and arrow overlapping
const numberFieldSx = {
  "& .MuiInputBase-root": {
    px: 1,
    height: 44,
    fontSize: "0.9rem",
  },
  "& input": {
    textAlign: "right" as const,
    px: 0.5,
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
      fontSize: "0.8rem",
      color: "var(--slate-500)",
      fontWeight: 600,
    },
  },
};

const textFieldSx = {
  "& .MuiInputBase-root": {
    px: 1.25,
    height: 44,
    fontSize: "0.9rem",
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
        fontSize: "0.8rem",
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
  const handleItemTypeChange = (key: string, value: string) => {
    const match = itemTypeOptions.find((o) => o.value === value);
    updateRow(key, {
      itemType: value,
      rate: match?.rate != null ? String(match.rate) : "",
      total: "",
    });
  };

  // Total Amount is editable, but the backend only ever persists Rate
  // (Width × Height × Rate × Pieces) - there's no separate "total" column
  // to save an override into. So typing a total here works by solving that
  // same equation backwards: Rate = Total ÷ (Area × Pieces). Only
  // meaningful once an area exists (the field is disabled with 0 area -
  // see the JSX), so this is never called with sqft <= 0.
  const handleTotalChange = (key: string, value: string) => {
    onChange(
      items.map((r) => {
        if (r.key !== key) return r;
        const area = sqFtOf(r);
        if (area <= 0) return r;
        const typed = toNumber(value);
        const derivedRate = Math.round((typed / (area * piecesOf(r))) * 1_000_000) / 1_000_000;
        return { ...r, total: value, rate: String(derivedRate) };
      })
    );
  };

  const addRow = () => onChange([...items, newRow()]);

  const removeRow = (key: string) =>
    onChange(items.length > 1 ? items.filter((r) => r.key !== key) : items);

  const totalSqFt = Math.round(items.reduce((sum, r) => sum + sqFtOf(r), 0) * 100) / 100;

  return (
    <>
      <Paper elevation={0} sx={{ border: "1px solid var(--slate-200)", borderRadius: 3, overflow: "hidden", mb: 2 }}>
        <Box sx={{ overflowX: "auto" }}>
          <Box sx={{ minWidth: 1220 }}>
            {/* Table Header */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: ITEM_ROW_GRID,
                gap: 1.25,
                bgcolor: "var(--slate-50)",
                borderBottom: "1px solid var(--slate-200)",
                px: 2,
                py: 1.5,
                alignItems: "center",
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
                    display: "grid",
                    gridTemplateColumns: ITEM_ROW_GRID,
                    gap: 1.25,
                    px: 2,
                    py: 1.25,
                    alignItems: "center",
                    borderTop: idx === 0 ? "none" : "1px solid var(--slate-100)",
                    bgcolor: idx % 2 === 0 ? "var(--white)" : "var(--slate-50)",
                  }}
                >
                  <Typography variant="body2" sx={{ color: "var(--slate-400)", fontWeight: 600, fontSize: "0.8rem" }}>
                    {idx + 1}
                  </Typography>

                  <Dropdown
                    placeholder="Select type"
                    options={itemTypeOptions.map((o) => o.value)}
                    value={row.itemType || undefined}
                    onChange={(v) => handleItemTypeChange(row.key, (v as string) || "")}
                  />

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
                  <TextField
                    type="number"
                    placeholder="0"
                    value={row.width}
                    onChange={(e) => updateRow(row.key, { width: e.target.value, total: "" })}
                    sx={numberFieldSx}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <UnitSelect value={row.unit} onChange={(unit) => updateRow(row.key, { unit, total: "" })} />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />

                  <TextField
                    type="number"
                    placeholder="0"
                    value={row.height}
                    onChange={(e) => updateRow(row.key, { height: e.target.value, total: "" })}
                    sx={numberFieldSx}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <UnitSelect value={row.unit} onChange={(unit) => updateRow(row.key, { unit, total: "" })} />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />

                  <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--slate-700)", textAlign: "right", pr: 0.5, fontSize: "0.85rem" }}>
                    {sqFtOf(row)}{" "}
                    <Typography component="span" sx={{ fontSize: "0.75rem", color: "var(--slate-500)", fontWeight: 500 }}>
                      sq ft
                    </Typography>
                  </Typography>

                  <TextField
                    type="number"
                    placeholder="1"
                    value={row.pieces}
                    onChange={(e) => updateRow(row.key, { pieces: e.target.value, total: "" })}
                    sx={numberFieldSx}
                    slotProps={{ htmlInput: { min: 1, step: 1 } }}
                  />

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
                        <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, fontStyle: "italic" }}>
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

                  <Tooltip title={sqFtOf(row) <= 0 ? "Enter Width and Height first" : ""}>
                    <span>
                      <TextField
                        type="number"
                        placeholder="0.00"
                        value={totalDisplayOf(row)}
                        onChange={(e) => handleTotalChange(row.key, e.target.value)}
                        disabled={sqFtOf(row) <= 0}
                        sx={{
                          ...numberFieldSx,
                          "& .MuiInputBase-input.Mui-disabled": {
                            WebkitTextFillColor: "var(--slate-400)",
                          },
                        }}
                        slotProps={{
                          input: {
                            startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                          },
                        }}
                      />
                    </span>
                  </Tooltip>

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
              ))}
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Row Control & Quick Calculations */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
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
