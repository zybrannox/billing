import { type GridRenderEditCellParams, type GridColDef } from "@mui/x-data-grid";
import { MenuItem, Select } from "@mui/material";
import { getSemanticColor } from "../utils/colors";

type SemanticSelectEditProps = GridRenderEditCellParams & {
  semantic: "priority" | "clientStatus" | "projectStatus" | "printStatus";
};

// valueOptions can be a plain array or a (row-aware) function - MUI resolves
// the function form for its own built-in editors, but this custom one needs
// to do it itself.
const resolveValueOptions = (
  colDef: GridColDef,
  params: GridRenderEditCellParams,
): (string | number)[] => {
  const options = (colDef as unknown as { valueOptions?: unknown }).valueOptions;
  const resolved = typeof options === "function" ? options(params) : options;
  return Array.isArray(resolved) ? resolved : [];
};

export const SemanticSelectEditCell = (props: SemanticSelectEditProps) => {
  const { id, field, value, api, semantic, colDef } = props;
  const color = getSemanticColor(semantic, value as string);

  const handleChange = (e: any) => {
    api.setEditCellValue({ id, field, value: e.target.value });
  };

  const options = resolveValueOptions(colDef, props);

  return (
    <Select
      value={value}
      onChange={handleChange}
      autoFocus
      fullWidth
      size="small"
      sx={{
        color,
        fontWeight: 600,
        // Matches the token set every other field in the app shares
        // (ui/TextField.tsx, ui/Dropdown.tsx, ui/DateTimePicker.tsx) -
        // without these, MUI's Select falls back to its own defaults
        // (16px font, ~16.5px vertical padding, 4px radius), which reads
        // oversized and out of place against the rest of the row.
        fontSize: "0.85rem",
        borderRadius: "var(--border-radius-md, 6px)",
        bgcolor: "#ffffff",
        transition: "background-color 0.2s ease, box-shadow 0.2s ease",

        "& .MuiSelect-select": {
          paddingTop: "6px",
          paddingBottom: "6px",
        },

        "& fieldset": {
          borderColor: "rgba(0, 0, 0, 0.12)",
          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
        },
        "&:hover fieldset": {
          borderColor: "var(--blue-300, #93c5fd)",
        },
        "&.Mui-focused fieldset": {
          borderColor: "var(--blue-500, #3b82f6)",
          borderWidth: "1px",
          boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.12)",
        },
      }}
    >
      {options.map((opt) => (
        <MenuItem
          key={opt}
          value={opt}
          sx={{
            fontSize: "0.85rem",
            color: getSemanticColor(semantic, opt as string),
          }}
        >
          {opt}
        </MenuItem>
      ))}
    </Select>
  );
};
