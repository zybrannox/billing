import { type GridRenderEditCellParams } from "@mui/x-data-grid";
import { MenuItem, Select } from "@mui/material";
import { getSemanticColor } from "../utils/colors";

type SemanticSelectEditProps = GridRenderEditCellParams & {
  semantic: "priority" | "clientStatus" | "projectStatus" | "printStatus";
};

export const SemanticSelectEditCell = ({
  id,
  field,
  value,
  api,
  semantic,
  colDef,
}: SemanticSelectEditProps) => {
  const color = getSemanticColor(semantic, value as string);

  const handleChange = (e: any) => {
    api.setEditCellValue({ id, field, value: e.target.value });
  };

  return (
    <Select
      value={value}
      onChange={handleChange}
      autoFocus
      fullWidth
      sx={{
        color,
        fontWeight: 600,
        // "& .MuiOutlinedInput-notchedOutline": {
        //   borderColor: color,
        // },
        // "&:hover .MuiOutlinedInput-notchedOutline": {
        //   borderColor: color,
        // },
        // "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
        //   borderColor: color,
        // },
      }}
    >
      {colDef.valueOptions?.map((opt) => (
        <MenuItem
          key={opt}
          value={opt}
          sx={{ color: getSemanticColor(semantic, opt as string) }}
        >
          {opt}
        </MenuItem>
      ))}
    </Select>
  );
};
