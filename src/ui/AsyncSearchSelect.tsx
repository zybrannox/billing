import React from "react";
import { Autocomplete, CircularProgress, TextField, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CloseIcon from "@mui/icons-material/Close";
import { apiService } from "../api/service";

interface AsyncSearchSelectProps {
  label?: React.ReactNode;
  placeholder?: string;
  endpoint: string;
  searchParam?: string;
  extraParams?: Record<string, string | number>;
  getOptionLabel: (item: any) => string;
  getOptionValue: (item: any) => string | number;
  value?: string | number | null;
  onChange?: (value: string | number | undefined) => void;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  className?: string;
  sx?: object;
  // Pre-resolved option to show for `value` without a server round-trip.
  // Needed when `value` isn't something `${endpoint}/{value}` can look up
  // directly - e.g. this field keys options by username, but the users
  // endpoint's single-record lookup is by numeric id, so that fetch 422s
  // and the field would otherwise silently show blank forever.
  initialOption?: any;
}

export default function AsyncSearchSelect({
  label,
  placeholder = "Type to search...",
  endpoint,
  searchParam = "search",
  extraParams,
  getOptionLabel,
  getOptionValue,
  value,
  onChange,
  error,
  helperText,
  disabled,
  className,
  sx,
  initialOption,
}: AsyncSearchSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const [options, setOptions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selected, setSelected] = React.useState<any | null>(null);

  const extraParamsKey = JSON.stringify(extraParams ?? {});

  // Fetch initial option object if value is provided externally but not yet loaded
  React.useEffect(() => {
    if (value == null || value === "") {
      setSelected(null);
      return;
    }

    if (selected && getOptionValue(selected) === value) return;

    // Search local options first
    const existing = options.find((o) => getOptionValue(o) === value);
    if (existing) {
      setSelected(existing);
      return;
    }

    // Caller already knows what this value resolves to - skip the fetch.
    if (initialOption && getOptionValue(initialOption) === value) {
      setSelected(initialOption);
      return;
    }

    // Attempt single record fetch from server if option is missing
    let active = true;
    (async () => {
      try {
        const data = await apiService.get<any>(`${endpoint}/${value}`);
        if (active && data) setSelected(data);
      } catch {
        // Fallback gracefully if single-endpoint lookup isn't supported
      }
    })();

    return () => {
      active = false;
    };
  }, [value, options, endpoint, getOptionValue, selected, initialOption]);

  // Debounced search query effect
  React.useEffect(() => {
    if (!open) return;

    let active = true;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const data = await apiService.get<any[] | { items: any[] }>(endpoint, {
          params: {
            [searchParam]: inputValue || undefined,
            ...JSON.parse(extraParamsKey),
          },
        });
        if (active) {
          setOptions(Array.isArray(data) ? data : data?.items ?? []);
        }
      } catch {
        if (active) setOptions([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, inputValue, endpoint, searchParam, extraParamsKey]);

  return (
    <div className={className} style={{ width: "100%" }}>
      {label && (
        <label className="text-xs font-medium text-gray-700 mb-1.5 block text-left">
          {label}
        </label>
      )}
      <Autocomplete
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        disabled={disabled}
        options={options}
        loading={loading}
        value={selected}
        filterOptions={(x) => x} // Disable client filtering since backend handles query
        isOptionEqualToValue={(a, b) => getOptionValue(a) === getOptionValue(b)}
        getOptionLabel={(opt) =>
          typeof opt === "string" ? opt : getOptionLabel(opt)
        }
        loadingText={
          <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
            Loading...
          </Typography>
        }
        noOptionsText={
          <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
            No options
          </Typography>
        }
        popupIcon={<ExpandMoreIcon sx={{ fontSize: 18, color: "text.secondary" }} />}
        clearIcon={
          <CloseIcon
            sx={{
              fontSize: 15,
              color: "var(--red-600)",
            }}
          />
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
              "& .MuiAutocomplete-loading, & .MuiAutocomplete-noOptions": {
                padding: "8px 12px",
                fontSize: "0.8rem",
              },
            },
          },
        }}
        onInputChange={(_, newInput) => setInputValue(newInput)}
        onChange={(_, newValue) => {
          setSelected(newValue);
          onChange?.(newValue ? getOptionValue(newValue) : undefined);
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
              {getOptionLabel(option)}
            </li>
          );
        }}
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
              borderColor: error
                ? "var(--red-500, #ef4444)"
                : "rgba(0, 0, 0, 0.12)",
              transition: "border-color 0.2s ease, box-shadow 0.2s ease",
            },
            "&:hover fieldset": {
              borderColor: error
                ? "var(--red-500, #ef4444)"
                : "var(--blue-300, #93c5fd)",
            },
            "&.Mui-focused fieldset": {
              borderColor: error
                ? "var(--red-500, #ef4444)"
                : "var(--blue-500, #3b82f6)",
              borderWidth: "1px",
              boxShadow: error
                ? "0 0 0 3px rgba(239, 68, 68, 0.12)"
                : "0 0 0 3px rgba(59, 130, 246, 0.12)",
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

          ...sx,
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={placeholder}
            error={error}
            helperText={helperText}
            size="small"
            slotProps={{
              input: {
                ...params.InputProps,
                endAdornment: (
                  <React.Fragment>
                    {loading ? (
                      <CircularProgress
                        size={15}
                        sx={{ color: "var(--blue-500, #3b82f6)", mr: 0.5 }}
                      />
                    ) : null}
                    {params.InputProps.endAdornment}
                  </React.Fragment>
                ),
              },
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