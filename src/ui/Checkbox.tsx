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
  label?: string;
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
                    color: "#0F172A",
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
                      color: "#94A3B8",
                      "&.Mui-checked": {
                        color: "#0F172A",
                      },
                    }}
                  />
                }
              />
            ))}
          </FormGroup>

          {error && (
            <FormHelperText sx={{ mx: 0, mt: 0.5, color: "#EF4444", fontSize: "0.75rem" }}>
              {error}
            </FormHelperText>
          )}

          {helperText && !error && (
            <FormHelperText sx={{ mx: 0, mt: 0.5, color: "#64748B", fontSize: "0.75rem" }}>
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
              color: "#0F172A",
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
                color: error ? "#EF4444" : "#94A3B8",
                "&.Mui-checked": {
                  color: error ? "#EF4444" : "#0F172A",
                },
              }}
            />
          }
        />

        {error && (
          <FormHelperText sx={{ mx: 0, mt: 0.25, color: "#EF4444", fontSize: "0.75rem" }}>
            {error}
          </FormHelperText>
        )}

        {helperText && !error && (
          <FormHelperText sx={{ mx: 0, mt: 0.25, color: "#64748B", fontSize: "0.75rem" }}>
            {helperText}
          </FormHelperText>
        )}
      </FormControl>
    );
  }
);

CheckboxField.displayName = "CheckboxField";

export default CheckboxField;