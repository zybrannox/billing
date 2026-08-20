import React, { forwardRef, useCallback, useId, useMemo } from "react";
import dayjs, { Dayjs } from "dayjs";
import {
  LocalizationProvider,
  DateTimePicker as MUIDateTimePicker,
} from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";

export type DateTimePickerProps = {
  label?: React.ReactNode;
  value?: string | null;
  onChange: (value: string | null) => void;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  minDate?: Dayjs;
  maxDate?: Dayjs;
  id?: string;
  placeholder?: string;
  className?: string;
};

const DateTimePicker = React.memo(
  forwardRef<HTMLDivElement, DateTimePickerProps>(
    (
      {
        label,
        value,
        onChange,
        error = false,
        helperText,
        disabled = false,
        minDate,
        maxDate,
        id,
        placeholder = "Select date & time...",
        className,
      },
      ref
    ) => {
      const generatedId = useId();
      const inputId = id || generatedId;

      const parsedValue = useMemo(() => {
        if (!value) return null;
        const d = dayjs(value);
        return d.isValid() ? d : null;
      }, [value]);

      const handleChange = useCallback(
        (newValue: Dayjs | null) => {
          if (!newValue || !newValue.isValid()) {
            onChange(null);
            return;
          }
          onChange(newValue.toISOString());
        },
        [onChange]
      );

      return (
        <div ref={ref} className={className} style={{ width: "100%" }}>
          {label && (
            <label
              htmlFor={inputId}
              className={`text-sm mb-1.5 block text-left font-medium transition-colors ${
                error
                  ? "text-red-500"
                  : disabled
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-slate-900"
              }`}
            >
              {label}
            </label>
          )}

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <MUIDateTimePicker
              value={parsedValue}
              onChange={handleChange}
              disabled={disabled}
              minDate={minDate}
              maxDate={maxDate}
              slots={{
                openPickerIcon: () => (
                  <CalendarTodayIcon
                    sx={{ fontSize: 15, color: "text.secondary" }}
                  />
                ),
              }}
              slotProps={{
                textField: {
                  id: inputId,
                  fullWidth: true,
                  error,
                  helperText,
                  size: "small",
                  placeholder,
                  disabled,
                  sx: {
                    // MUI's DateTimePicker does NOT render a standard
                    // MuiOutlinedInput - it has its own PickersOutlinedInput
                    // component with different class names entirely
                    // (MuiPickersOutlinedInput-* / MuiPickersInputBase-*,
                    // and a div.notchedOutline instead of a <fieldset>). The
                    // old selectors here silently matched nothing.
                    "& .MuiPickersOutlinedInput-root": {
                      minHeight: 36,
                      paddingLeft: "10px !important",
                      paddingRight: "6px !important", // Gives inner spacing for the adornment
                      fontSize: "0.85rem",
                      borderRadius: "var(--border-radius-md, 6px)",
                      bgcolor: disabled ? "rgba(0, 0, 0, 0.02)" : "#ffffff",
                      transition:
                        "background-color 0.2s ease, box-shadow 0.2s ease",
                    },

                    // Same tokens as ui/TextField.tsx and ui/Dropdown.tsx -
                    // every field in a form must read as one control style.
                    // !important is required here: MUI's own built-in
                    // Mui-focused/hover rules for MuiPickersOutlinedInput
                    // outrank a plain sx override on these nested selectors.
                    "& .MuiPickersOutlinedInput-notchedOutline": {
                      borderColor: `${error ? "#ef4444" : "rgba(0, 0, 0, 0.12)"} !important`,
                      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                    },
                    "&:hover .MuiPickersOutlinedInput-notchedOutline": {
                      borderColor: `${error ? "#ef4444" : "var(--blue-300, #93c5fd)"} !important`,
                    },
                    "&.Mui-focused .MuiPickersOutlinedInput-notchedOutline": {
                      borderColor: `${error ? "#ef4444" : "var(--blue-500, #3b82f6)"} !important`,
                      borderWidth: "1px !important",
                    },
                    "&.Mui-focused": {
                      boxShadow: error
                        ? "0 0 0 3px rgba(239, 68, 68, 0.12)"
                        : "0 0 0 3px rgba(59, 130, 246, 0.12)",
                      borderRadius: "var(--border-radius-md, 6px)",
                    },

                    // Prevents icon from touching the right border
                    "& .MuiInputAdornment-root": {
                      marginRight: "2px",
                      marginLeft: "4px",
                    },

                    "& .MuiPickersInputBase-input": {
                      paddingY: "6px",
                      paddingLeft: "0px",
                    },

                    "& .MuiPickersInputBase-input::placeholder": {
                      color: "text.secondary",
                      opacity: 0.7,
                      fontSize: "0.85rem",
                    },

                    "& .MuiIconButton-root": {
                      padding: "4px",
                      borderRadius: "var(--border-radius-sm, 4px)",
                      transition: "background-color 0.15s ease",
                      "&.MuiIconButton-edgeEnd": {
                        marginRight: 0,
                      },
                      "&:hover": {
                        bgcolor: "rgba(0, 0, 0, 0.06)",
                      },
                    },

                    "& .MuiFormHelperText-root": {
                      marginLeft: 0,
                      marginTop: "4px",
                      fontSize: "0.75rem",
                    },
                  },
                },

                // Dropdown / Popover Dialog Styling
                desktopPaper: {
                  sx: {
                    borderRadius: "var(--border-radius-md, 6px)",
                    marginTop: "4px",
                    boxShadow:
                      "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
                    border: "1px solid rgba(0, 0, 0, 0.08)",
                    overflow: "hidden",

                    // Calendar Day Cells
                    "& .MuiPickersDay-root": {
                      fontSize: "0.78rem",
                      borderRadius: "var(--border-radius-sm, 4px)",
                      "&.Mui-selected": {
                        bgcolor: "#3b82f6 !important",
                        fontWeight: 600,
                      },
                      "&:hover": {
                        bgcolor: "rgba(59, 130, 246, 0.08)",
                      },
                    },

                    // Calendar Navigation
                    "& .MuiPickersCalendarHeader-root": {
                      paddingLeft: "12px",
                      paddingRight: "12px",
                      minHeight: "40px",
                    },
                    "& .MuiPickersCalendarHeader-label": {
                      fontSize: "0.85rem",
                      fontWeight: 600,
                    },

                    // Time Picker List Columns
                    "& .MuiMultiSectionDigitalClock-root": {
                      borderLeft: "1px solid rgba(0, 0, 0, 0.06)",
                    },
                    "& .MuiMenuItem-root": {
                      fontSize: "0.8rem",
                      borderRadius: "var(--border-radius-sm, 4px)",
                      margin: "2px 4px",
                      padding: "4px 8px",
                      "&.Mui-selected": {
                        bgcolor: "rgba(59, 130, 246, 0.12) !important",
                        color: "#2563eb",
                        fontWeight: 600,
                      },
                    },

                    // Bottom Action Toolbar (if applicable)
                    "& .MuiPickersLayout-actionBar": {
                      padding: "8px 12px",
                      "& .MuiButton-root": {
                        fontSize: "0.78rem",
                        textTransform: "none",
                        fontWeight: 500,
                        borderRadius: "var(--border-radius-sm, 4px)",
                      },
                    },
                  },
                },
              }}
            />
          </LocalizationProvider>
        </div>
      );
    }
  )
);

DateTimePicker.displayName = "DateTimePicker";

export default DateTimePicker;