import React from "react";
import {
  FormControl,
  FormControlLabel,
  FormHelperText,
  RadioGroup,
} from "@mui/material";
import MuiRadio from "@mui/material/Radio";

export interface Option {
  label: string;
  value: string;
  color?: string;
}

interface RadioFieldProps {
  value: string;
  options?: Option[];
  label?: string;
  error?: string;
  onChange: (val: string) => void;
}

const RadioField = React.memo(
  ({ value, options, label, error, onChange }: RadioFieldProps) => {
    const isGroup = Array.isArray(options) && options.length > 0;

    // ---- GROUP RADIO ---- //
    if (isGroup) {
      return (
        <FormControl error={!!error} component="fieldset">
          {label && <p style={{ marginBottom: 6 }}>{label}</p>}

          <RadioGroup
            row
            value={value}
            onChange={(e) => onChange(e.target.value)}
          >
            {options?.map((opt) => (
              <FormControlLabel
                key={opt.value}
                value={opt.value}
                sx={{
                  "& .MuiFormControlLabel-label": {
                    color: "#000",
                    fontSize: "0.875rem",
                  },
                }}
                control={
                  <MuiRadio
                    sx={{
                      color: opt.color ?? "#64748B",
                      "&.Mui-checked": {
                        color: opt.color ?? "#64748B",
                      },
                    }}
                  />
                }
                label={opt.label}
              />
            ))}
          </RadioGroup>

          {error && <FormHelperText>{error}</FormHelperText>}
        </FormControl>
      );
    }

    // ---- SINGLE RADIO ---- //
    return (
      <FormControl error={!!error}>
        <FormControlLabel
          label={label}
           sx={{
    "& .MuiFormControlLabel-label": {
      color: "#000",
      fontSize: "0.875rem",
    },
  }}
          control={
            <MuiRadio
              checked={value === "true"}
              onChange={(e) => onChange(e.target.checked ? "true" : "false")}
            />
          }
        />
        {error && <FormHelperText>{error}</FormHelperText>}
      </FormControl>
    );
  },
);

RadioField.displayName = "RadioField";

export default RadioField;
