import TextField from "@mui/material/TextField";
import { Autocomplete, Checkbox } from "@mui/material";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import CheckBoxIcon from "@mui/icons-material/CheckBox";

type DropdownProps = {
  options?: string[]; // static
  label?: string;
  placeholder?: string;
  multiple?: boolean; // For Multiple Selection
  value?: string | string[];
  onChange?: (value?: string | string[]) => void;
  disabled?: boolean;
  freeSolo?: boolean;
  sx?: object;
};

const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;

export default function Dropdown({
  options,
  label,
  placeholder = "Select",
  multiple = false,
  value,
  onChange,
  disabled = false,
  freeSolo = false,
  sx,
}: DropdownProps) {
  const resolvedOptions = options || [];
  const normalizedValue = multiple
    ? Array.isArray(value)
      ? value
      : []
    : typeof value === "string"
      ? value
      : null;

  return (
    <div>
      {label && (
        <label className="text-sm text-black text-start mb-2 block">
          {label}
        </label>
      )}
      <Autocomplete
        id={label}
        multiple={multiple}
        disablePortal
        disabled={disabled}
        freeSolo={freeSolo}
        disableCloseOnSelect={multiple}
        options={resolvedOptions}
        value={normalizedValue} // controlled value
        isOptionEqualToValue={(option, v) => option === v} // how to compare values
        onChange={(_, newValue) => {
          onChange?.(newValue ?? undefined);
        }}
        sx={{
          minWidth: "150px",

          "& .MuiOutlinedInput-root": {
            marginTop: 0,
            borderRadius: "var(--border-radius-md)",
            color: "#000",
            "& fieldset": {
              borderWidth: "1.5px",
              borderColor: "var(--border-color)",
            },
            "&:hover fieldset": {
              borderColor: "var(--border-focus-color)",
            },
            "&.Mui-focused fieldset": {
              borderColor: "var(--border-focus-color)",
            },
            "& input::-webkit-calendar-picker-indicator": {
              filter: "invert(1) brightness(0.5)", // white color
              cursor: "pointer",
            },
            ".MuiSelect-icon": {
            color:"#000",
            },
          },

          "& .MuiAutocomplete-clearIndicator": {
            color:"#000",
            "&:hover": {
              color: "var(--border-focus-color)",
            },
          },

          "& .MuiAutocomplete-popupIndicator": {
            color:"#000",
          },

          "& .MuiAutocomplete-input": {
            color:"#000",
            cursor: "pointer",
          },
          // MultiSelect Chip
          "& .MuiAutocomplete-tag": {
            backgroundColor: "var(--border-color)",
            color:"#000",
            borderRadius: "6px",
          },
          "& .MuiAutocomplete-tag .MuiChip-deleteIcon": {
            color: "#9ca3af",
            "&:hover": {
              color: "#f87171",
            },
          },

          ...sx,
        }}
        renderOption={(props, option, { selected }) => {
          const { key, ...rest } = props;

          return (
            <li key={key} {...rest} className="text-black">
              {multiple && (
                <Checkbox
                  icon={icon}
                  checkedIcon={checkedIcon}
                  checked={selected}
                  sx={{ mr: 1 }}
                />
              )}
              {option}
            </li>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            id={label}
            placeholder={placeholder}
            size="small"
            InputProps={{
              ...params.InputProps,
              // If not multiple AND not freeSolo, then it's readOnly (standard dropdown).
              // If freeSolo is true, user MUST be able to type.
              readOnly: !multiple && !freeSolo,
            }}
            sx={{
              borderRadius: "var(--border-radius-md)",
              "& .MuiInputBase-input::placeholder": {
                color: "#000",
              },
            }}
          />
        )}
      />
    </div>
  );
}
