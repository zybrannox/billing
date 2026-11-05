import type { FocusEvent, KeyboardEvent, ReactNode } from "react";
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
  // Also accept text that isn't one of `options`: Enter or leaving the field
  // commits whatever was typed, and onChange receives that text.
  freeSolo?: boolean;
}

const normalize = (opt: SearchSelectOption): NormalizedOption =>
  typeof opt === "string" ? { label: opt, value: opt } : opt;

/**
 * Single-select picker you search by typing - the same look as SearchInput
 * (search icon, clear button), and the result is one of `options` unless
 * `freeSolo` allows free text too. Reach for this over Dropdown when the list is long
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
  freeSolo = false,
}: SearchSelectProps) {
  const normalized = (options ?? []).map(normalize);
  const selected =
    value !== undefined && value !== null && value !== ""
      ? (normalized.find((o) => o.value === value) ?? { label: String(value), value })
      : null;

  // Free text arrives untrimmed, and leaving the field re-submits its current
  // text - only a real change may reach the caller, which may well do
  // something with it (the item grid re-syncs a row's rate on change).
  const commit = (next?: string | number) => {
    const clean = typeof next === "string" ? next.trim() || undefined : next;
    if (clean !== (selected?.value ?? undefined) && clean !== selected?.label) onChange?.(clean);
  };

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
        freeSolo={freeSolo}
        onChange={(_, next) => commit(typeof next === "string" ? next : next?.value)}
        getOptionLabel={(o) => (typeof o === "string" ? o : o.label)}
        isOptionEqualToValue={(o, v) => o.value === v.value}
        // Typing filters, and a matching entry is highlighted as you type -
        // Enter picks it, so a keyboard-only user never touches the mouse.
        // Not with free text: "Banner" would turn into "Banner Stand" on Enter.
        autoHighlight={!freeSolo}
        openOnFocus
        noOptionsText={
          <Typography sx={{ fontSize: "var(--fs-sm)", color: "text.secondary" }}>{noOptionsText}</Typography>
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
                fontSize: "var(--fs-md)",
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
              htmlInput: freeSolo
                ? {
                    ...params.inputProps,
                    onBlur: (e: FocusEvent<HTMLInputElement>) => {
                      params.inputProps.onBlur?.(e);
                      commit(e.target.value);
                    },
                    // Commits the text (handled by Autocomplete) without also
                    // submitting a form this happens to be inside.
                    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === "Enter") e.preventDefault();
                      params.inputProps.onKeyDown?.(e);
                    },
                  }
                : params.inputProps,
            }}
            sx={{
              "& .MuiInputBase-input::placeholder": { color: "text.secondary", opacity: 0.7 },
              "& .MuiFormHelperText-root": { marginLeft: 0, marginTop: "4px", fontSize: "var(--fs-xs)" },
            }}
          />
        )}
        sx={{
          minWidth: "160px",
          "& .MuiOutlinedInput-root": {
            minHeight: 36,
            paddingY: "2px !important",
            paddingLeft: "10px !important",
            fontSize: "var(--fs-md)",
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
