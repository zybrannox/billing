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
  label?: React.ReactNode;
  error?: string;
  onChange: (val: string) => void;
}

const RadioField = React.memo(
  ({ value, options, label, error, onChange }: RadioFieldProps) => {
    const isGroup = Array.isArray(options) && options.length > 0;

    // ---- GROUP RADIO ---- //
    if (isGroup) {
      return (
        <FormControl error={!!error} component="fieldset" sx={{ width: "100%" }}>
          {label && (
            <label
              className={`text-xs font-medium mb-1.5 block text-left transition-colors ${
                error ? "text-red-500" : "text-gray-700"
              }`}
            >
              {label}
            </label>
          )}

          <RadioGroup
            row
            value={value}
            onChange={(e) => onChange(e.target.value)}
            sx={{
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            {options?.map((opt) => {
              const activeColor = opt.color ?? "#334155";

              return (
                <FormControlLabel
                  key={opt.value}
                  value={opt.value}
                  label={opt.label}
                  sx={{
                    margin: 0,
                    marginRight: "4px",
                    "& .MuiFormControlLabel-label": {
                      color: value === opt.value ? "#0f172a" : "#475569",
                      fontSize: "0.85rem",
                      fontWeight: value === opt.value ? 500 : 400,
                      transition: "color 0.15s ease",
                      userSelect: "none",
                    },
                  }}
                  control={
                    <MuiRadio
                      size="small"
                      sx={{
                        padding: "4px",
                        marginRight: "4px",
                        color: "#cbd5e1",
                        transition: "color 0.15s ease",
                        "&:hover": {
                          backgroundColor: "rgba(0, 0, 0, 0.04)",
                        },
                        "&.Mui-checked": {
                          color: activeColor,
                        },
                        "& .MuiSvgIcon-root": {
                          fontSize: 18,
                        },
                      }}
                    />
                  }
                />
              );
            })}
          </RadioGroup>

          {error && (
            <FormHelperText
              sx={{
                marginLeft: 0,
                marginTop: "4px",
                fontSize: "0.75rem",
                color: "#ef4444",
              }}
            >
              {error}
            </FormHelperText>
          )}
        </FormControl>
      );
    }

    // ---- SINGLE RADIO ---- //
    const isSingleChecked = value === "true";

    return (
      <FormControl error={!!error}>
        <FormControlLabel
          label={label}
          sx={{
            margin: 0,
            "& .MuiFormControlLabel-label": {
              color: error ? "#ef4444" : isSingleChecked ? "#0f172a" : "#475569",
              fontSize: "0.85rem",
              fontWeight: isSingleChecked ? 500 : 400,
              transition: "color 0.15s ease",
              userSelect: "none",
            },
          }}
          control={
            <MuiRadio
              size="small"
              checked={isSingleChecked}
              onChange={(e) => onChange(e.target.checked ? "true" : "false")}
              sx={{
                padding: "4px",
                marginRight: "4px",
                color: error ? "#fca5a5" : "#cbd5e1",
                transition: "color 0.15s ease",
                "&:hover": {
                  backgroundColor: "rgba(0, 0, 0, 0.04)",
                },
                "&.Mui-checked": {
                  color: error ? "#ef4444" : "#334155",
                },
                "& .MuiSvgIcon-root": {
                  fontSize: 18,
                },
              }}
            />
          }
        />
        {error && (
          <FormHelperText
            sx={{
              marginLeft: 0,
              marginTop: "4px",
              fontSize: "0.75rem",
              color: "#ef4444",
            }}
          >
            {error}
          </FormHelperText>
        )}
      </FormControl>
    );
  }
);

RadioField.displayName = "RadioField";

export default RadioField;