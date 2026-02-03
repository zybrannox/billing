import React from "react";
import { FormControl, FormControlLabel, FormHelperText, FormGroup } from "@mui/material";
import MuiCheckbox from "@mui/material/Checkbox";

export interface Option {
  label: string;
  value: string;
}

interface CheckboxFieldProps {
  value: boolean | string[];
  options?: Option[];
  label?: string;
  error?: string;
  onChange: (val: boolean | string[]) => void;
}

const CheckboxField = React.memo(
  ({ value, options, label, error, onChange }: CheckboxFieldProps) => {
    const isGroup = Array.isArray(options) && options.length > 0;

    // ---- GROUP CHECKBOX ---- //
    if (isGroup) {
      const handleToggle = (v: string) => {
        const next = (value as string[]).includes(v)
          ? (value as string[]).filter((x) => x !== v)
          : [...(value as string[]), v];
        onChange(next);
      };

      return (
        <FormControl error={!!error} component="fieldset">
          <FormGroup>
            {options?.map((opt) => (
              <FormControlLabel
                key={opt.value}
                label={opt.label}
                control={
                  <MuiCheckbox
                    checked={(value as string[])?.includes(opt.value)}
                    onChange={() => handleToggle(opt.value)}
                  />
                }
              />
            ))}
          </FormGroup>

          {error && <FormHelperText>{error}</FormHelperText>}
        </FormControl>
      );
    }

    // ---- SINGLE CHECKBOX ---- //
    return (
      <FormControl error={!!error}>
        <FormControlLabel
          label={label}
          control={
            <MuiCheckbox
              checked={!!value}
              onChange={(e) => onChange(e.target.checked)}
            />
          }
        />
        {error && <FormHelperText>{error}</FormHelperText>}
      </FormControl>
    );
  }
);

CheckboxField.displayName = "CheckboxField";

export default CheckboxField;
