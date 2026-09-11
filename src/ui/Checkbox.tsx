import React from "react";
import {
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormGroup,
  Checkbox as MuiCheckbox,
} from "@mui/material";

export interface Option {
  label: string;
  value: string;
}

interface CheckboxFieldProps {
  value?: boolean | string[];
  options?: Option[];
  label?: React.ReactNode;
  error?: string;
  helperText?: string;
  direction?: "row" | "column";
  onChange: (val: boolean | string[]) => void;
}

const CheckboxField = React.memo(
  ({
    value,
    options,
    label,
    error,
    helperText,
    direction = "column",
    onChange,
  }: CheckboxFieldProps) => {
    const isGroup = Array.isArray(options) && options.length > 0;

    // ---- GROUP CHECKBOX ---- //
    if (isGroup) {
      const selectedValues = Array.isArray(value) ? value : [];

      const handleToggle = (optValue: string) => {
        const next = selectedValues.includes(optValue)
          ? selectedValues.filter((x) => x !== optValue)
          : [...selectedValues, optValue];
        onChange(next);
      };

      return (
        <FormControl error={!!error} component="fieldset" sx={{ width: "100%" }}>
          {label && (
            <label
              className={`text-xs font-medium mb-1.5 block text-left ${
                error ? "text-red-500" : "text-gray-700"
              }`}
            >
              {label}
            </label>
          )}

          <FormGroup row={direction === "row"}>
            {options.map((opt) => (
              <FormControlLabel
                key={opt.value}
                label={opt.label}
                sx={{
                  mr: direction === "row" ? 2.5 : 0,
                  "& .MuiFormControlLabel-label": {
                    color: "var(--slate-900)",
                    fontSize: "0.85rem",
                    fontWeight: 500,
                  },
                }}
                control={
                  <MuiCheckbox
                    size="small"
                    checked={selectedValues.includes(opt.value)}
                    onChange={() => handleToggle(opt.value)}
                    sx={{
                      color: "var(--slate-400)",
                      "&.Mui-checked": {
                        color: "var(--slate-900)",
                      },
                    }}
                  />
                }
              />
            ))}
          </FormGroup>

          {error && (
            <FormHelperText sx={{ mx: 0, mt: 0.5, color: "var(--red-500)", fontSize: "0.75rem" }}>
              {error}
            </FormHelperText>
          )}

          {helperText && !error && (
            <FormHelperText sx={{ mx: 0, mt: 0.5, color: "var(--slate-500)", fontSize: "0.75rem" }}>
              {helperText}
            </FormHelperText>
          )}
        </FormControl>
      );
    }

    // ---- SINGLE CHECKBOX ---- //
    const isChecked = typeof value === "boolean" ? value : false;

    return (
      <FormControl error={!!error} sx={{ width: "100%" }}>
        <FormControlLabel
          label={label}
          sx={{
            "& .MuiFormControlLabel-label": {
              color: "var(--slate-900)",
              fontSize: "0.85rem",
              fontWeight: 500,
            },
          }}
          control={
            <MuiCheckbox
              size="small"
              checked={isChecked}
              onChange={(e) => onChange(e.target.checked)}
              sx={{
                color: error ? "var(--red-500)" : "var(--slate-400)",
                "&.Mui-checked": {
                  color: error ? "var(--red-500)" : "var(--slate-900)",
                },
              }}
            />
          }
        />

        {error && (
          <FormHelperText sx={{ mx: 0, mt: 0.25, color: "var(--red-500)", fontSize: "0.75rem" }}>
            {error}
          </FormHelperText>
        )}

        {helperText && !error && (
          <FormHelperText sx={{ mx: 0, mt: 0.25, color: "var(--slate-500)", fontSize: "0.75rem" }}>
            {helperText}
          </FormHelperText>
        )}
      </FormControl>
    );
  }
);

CheckboxField.displayName = "CheckboxField";

export default CheckboxField;