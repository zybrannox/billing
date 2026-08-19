import TextField from "@mui/material/TextField";
import { Autocomplete, Checkbox, Chip, Typography } from "@mui/material";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CloseIcon from "@mui/icons-material/Close";

export type DropdownOption =
  | string
  | { label: string; value: string | number; color?: string };

type NormalizedOption = { label: string; value: string | number };

type DropdownProps = {
  options?: DropdownOption[];
  label?: string;
  placeholder?: string;
  multiple?: boolean;
  value?: string | number | (string | number)[];
  onChange?: (value?: string | number | (string | number)[]) => void;
  disabled?: boolean;
  freeSolo?: boolean;
  sx?: object;
  className?: string;
  error?: boolean;
  helperText?: string;
};

const icon = (
  <CheckBoxOutlineBlankIcon
    fontSize="small"
    sx={{ color: "text.secondary", fontSize: 18 }}
  />
);
const checkedIcon = (
  <CheckBoxIcon
    fontSize="small"
    sx={{ color: "var(--blue-500, #3b82f6)", fontSize: 18 }}
  />
);

const normalizeOption = (opt: DropdownOption): NormalizedOption =>
  typeof opt === "string" ? { label: opt, value: opt } : opt;

export default function Dropdown({
  options,
  label,
  placeholder = "Select...",
  multiple = false,
  value,
  onChange,
  disabled = false,
  freeSolo = false,
  sx,
  className,
  error = false,
  helperText,
}: DropdownProps) {
  const normalizedOptions = (options || []).map(normalizeOption);

  const findOption = (v: string | number): NormalizedOption =>
    normalizedOptions.find((o) => o.value === v) ?? {
      label: String(v),
      value: v,
    };

  const normalizedValue = multiple
    ? (Array.isArray(value) ? value : []).map(findOption)
    : value !== undefined && value !== null && value !== ""
      ? findOption(value as string | number)
      : null;

  const extractValue = (
    v: NormalizedOption | string | null | undefined,
  ): string | number | undefined | null =>
    v == null ? v : typeof v === "string" ? v : v.value;

  return (
    <div className={className} style={{ width: "100%" }}>
      {label && (
        <label
          className={`text-xs font-medium mb-1.5 block text-left transition-colors ${
            error
              ? "text-red-500"
              : disabled
                ? "text-gray-400 cursor-not-allowed"
                : "text-gray-700"
          }`}
        >
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
        options={normalizedOptions}
        popupIcon={<ExpandMoreIcon sx={{ fontSize: 18, color: "text.secondary" }} />}
        clearIcon={
          <CloseIcon
            sx={{
              fontSize: 15,
              color: "var(--red-600)",
            }}
          />
        }
        noOptionsText={
          <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
            No options
          </Typography>
        }
        slotProps={{
          clearIndicator: { type: "button" },
          popupIndicator: { type: "button" },
          paper: {
            sx: {
              borderRadius: "var(--border-radius-md, 6px)",
              marginTop: "4px",
              boxShadow:
                "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
              border: "1px solid rgba(0, 0, 0, 0.08)",
              "& .MuiAutocomplete-noOptions": {
                padding: "8px 12px",
                fontSize: "0.8rem",
              },
            },
          },
        }}
        getOptionLabel={(option) =>
          typeof option === "string" ? option : option.label
        }
        value={normalizedValue as any}
        isOptionEqualToValue={(option, v) =>
          (typeof option === "string" ? option : option.value) ===
          (typeof v === "string" ? v : v?.value)
        }
        onChange={(_, newValue) => {
          if (multiple) {
            const values = (newValue as (NormalizedOption | string)[]).map(
              extractValue,
            );
            onChange?.(values.filter((v) => v != null) as (string | number)[]);
          } else {
            onChange?.(
              extractValue(newValue as NormalizedOption | string | null) ??
                undefined,
            );
          }
        }}
        renderTags={(tagValue, getTagProps) =>
          tagValue.map((option, index) => {
            const { key, ...tagProps } = getTagProps({ index });
            const labelText =
              typeof option === "string" ? option : option.label;
            return (
              <Chip
                key={key}
                label={labelText}
                size="small"
                {...tagProps}
                sx={{
                  height: 24,
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  bgcolor: "rgba(0, 0, 0, 0.04)",
                  border: "1px solid rgba(0, 0, 0, 0.08)",
                  borderRadius: "var(--border-radius-sm, 4px)",
                  color: "text.primary",
                  "& .MuiChip-deleteIcon": {
                    fontSize: 14,
                    color: "text.secondary",
                    transition: "color 0.15s ease",
                    "&:hover": {
                      color: "var(--red-500, #ef4444)",
                    },
                  },
                }}
              />
            );
          })
        }
        sx={{
          minWidth: "160px",

          "& .MuiOutlinedInput-root": {
            minHeight: 36,
            paddingY: "2px !important",
            paddingX: "8px !important",
            fontSize: "0.85rem",
            borderRadius: "var(--border-radius-md, 6px)",
            bgcolor: disabled ? "rgba(0, 0, 0, 0.02)" : "#ffffff",
            transition: "background-color 0.2s ease, box-shadow 0.2s ease",

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
            "&.Mui-error fieldset": {
              borderColor: "#ef4444",
            },
          },

          "& .MuiAutocomplete-clearIndicator": {
            padding: "3px",
            borderRadius: "var(--border-radius-sm, 4px)",
            transition: "background-color 0.15s ease, color 0.15s ease",
            "&:hover": {
              bgcolor: "var(--red-50, #fef2f2)",
            },
          },

          "& .MuiAutocomplete-popupIndicator": {
            padding: "3px",
            borderRadius: "var(--border-radius-sm, 4px)",
            transition: "background-color 0.15s ease, transform 0.2s ease-in-out",
            "&:hover": {
              bgcolor: "rgba(0, 0, 0, 0.05)",
            },
          },

          "& .MuiAutocomplete-inputRoot": {
            cursor: "pointer",
          },

          ...sx,
        }}
        renderOption={(props, option, { selected }) => {
          const { key, ...rest } = props;
          const displayLabel =
            typeof option === "string" ? option : option.label;

          return (
            <li
              key={key}
              {...rest}
              style={{
                fontSize: "0.85rem",
                paddingTop: 6,
                paddingBottom: 6,
                borderRadius: "var(--border-radius-sm, 4px)",
                margin: "2px 4px",
              }}
            >
              {multiple && (
                <Checkbox
                  icon={icon}
                  checkedIcon={checkedIcon}
                  checked={selected}
                  size="small"
                  sx={{ padding: 0.5, mr: 1 }}
                />
              )}
              {displayLabel}
            </li>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={
              multiple && Array.isArray(value) && value.length > 0
                ? ""
                : placeholder
            }
            size="small"
            error={error}
            helperText={helperText}
            InputProps={{
              ...params.InputProps,
              readOnly: !multiple && !freeSolo,
            }}
            sx={{
              "& .MuiInputBase-input::placeholder": {
                color: "text.secondary",
                opacity: 0.7,
              },
              "& .MuiFormHelperText-root": {
                marginLeft: 0,
                marginTop: "4px",
                fontSize: "0.75rem",
              },
            }}
          />
        )}
      />
    </div>
  );
}