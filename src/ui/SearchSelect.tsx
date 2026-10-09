import type { ReactNode } from "react";
import { Autocomplete, InputAdornment, TextField, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";

export type SearchSelectOption =
  | string
  | { label: string; value: string | number };

type NormalizedOption = { label: string; value: string | number };

interface SearchSelectProps {
  options?: SearchSelectOption[];
  value?: string | number;
  onChange?: (value?: string | number) => void;
  label?: ReactNode;
  placeholder?: string;
  noOptionsText?: string;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  sx?: object;
  className?: string;
}

const normalize = (opt: SearchSelectOption): NormalizedOption =>
  typeof opt === "string" ? { label: opt, value: opt } : opt;

/**
 * Single-select picker you search by typing - the same look as SearchInput
 * (search icon, clear button), but the result is always one of `options`,
 * never free text. Reach for this over Dropdown when the list is long
 * enough that scrolling to find an entry is slower than typing it
 * (Dropdown's input is read-only, so it can't be searched).
 */
export default function SearchSelect({
  options,
  value,
  onChange,
  label,
  placeholder = "Search...",
  noOptionsText = "No matches",
  disabled = false,
  error = false,
  helperText,
  sx,
  className,
}: SearchSelectProps) {
  const normalized = (options ?? []).map(normalize);
  const selected =
    value !== undefined && value !== null && value !== ""
      ? (normalized.find((o) => o.value === value) ?? { label: String(value), value })
      : null;

  return (
    <div className={className} style={{ width: "100%" }}>
      {label && (
        <label
          className={`text-xs font-medium mb-1.5 block text-left ${
            error ? "text-red-500" : disabled ? "text-gray-400" : "text-gray-700"
          }`}
        >
          {label}
        </label>
      )}
      <Autocomplete
        size="small"
        disabled={disabled}
        options={normalized}
        value={selected}
        onChange={(_, next) => onChange?.(next?.value)}
        getOptionLabel={(o) => o.label}
        isOptionEqualToValue={(o, v) => o.value === v.value}
        // Typing filters, and a matching entry is highlighted as you type -
        // Enter picks it, so a keyboard-only user never touches the mouse.
        autoHighlight
        openOnFocus
        noOptionsText={
          <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>{noOptionsText}</Typography>
        }
        clearIcon={<CloseIcon sx={{ fontSize: 15, color: "var(--red-600)" }} />}
        slotProps={{
          clearIndicator: { type: "button" },
          paper: {
            sx: {
              borderRadius: "var(--border-radius-md, 6px)",
              marginTop: "4px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
              border: "1px solid rgba(0, 0, 0, 0.08)",
            },
          },
        }}
        renderOption={(props, option) => {
          const { key, ...rest } = props;
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
              {option.label}
            </li>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={placeholder}
            error={error}
            helperText={helperText}
            slotProps={{
              input: {
                ...params.InputProps,
                startAdornment: (
                  <InputAdornment position="start" sx={{ marginRight: 0.5 }}>
                    <SearchIcon sx={{ fontSize: 18, color: "var(--blue-400, var(--slate-400))" }} />
                  </InputAdornment>
                ),
              },
              htmlInput: params.inputProps,
            }}
            sx={{
              "& .MuiInputBase-input::placeholder": { color: "text.secondary", opacity: 0.7 },
              "& .MuiFormHelperText-root": { marginLeft: 0, marginTop: "4px", fontSize: "0.75rem" },
            }}
          />
        )}
        sx={{
          minWidth: "160px",
          "& .MuiOutlinedInput-root": {
            minHeight: 36,
            paddingY: "2px !important",
            paddingLeft: "10px !important",
            fontSize: "0.85rem",
            borderRadius: "var(--border-radius-md, 6px)",
            bgcolor: disabled ? "rgba(0, 0, 0, 0.02)" : "var(--white)",
            transition: "background-color 0.2s ease, box-shadow 0.2s ease",
            "& fieldset": {
              borderColor: "rgba(0, 0, 0, 0.12)",
              transition: "border-color 0.2s ease, box-shadow 0.2s ease",
            },
            "&:hover fieldset": { borderColor: "var(--blue-300)" },
            "&.Mui-focused fieldset": {
              borderColor: "var(--blue-500)",
              borderWidth: "1px",
              boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.12)",
            },
            "&.Mui-error fieldset": { borderColor: "var(--red-500)" },
          },
          "& .MuiAutocomplete-clearIndicator": {
            padding: "3px",
            borderRadius: "var(--border-radius-sm, 4px)",
            "&:hover": { bgcolor: "var(--red-50)" },
          },
          ...sx,
        }}
      />
    </div>
  );
}
