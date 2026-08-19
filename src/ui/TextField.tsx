import { useState, forwardRef, useId, type ReactNode } from "react";
import {
  TextField as MuiTextField,
  type TextFieldProps,
  IconButton,
  InputAdornment,
} from "@mui/material";
import { RemoveRedEyeOutlined, VisibilityOff } from "@mui/icons-material";

export type CustomTextFieldProps = Omit<TextFieldProps, "variant"> & {
  variant?: "outlined" | "filled" | "standard";
};

const TextField = forwardRef<HTMLDivElement, CustomTextFieldProps>(
  (
    {
      sx,
      type = "text",
      multiline = false,
      label,
      rows,
      id,
      slotProps,
      disabled,
      error,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const [showPassword, setShowPassword] = useState(false);

    const isPassword = type === "password";
    const isNumber = type === "number";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className={`text-xs font-medium mb-1.5 block text-left transition-colors ${
              error
                ? "text-red-500"
                : disabled
                ? "text-gray-400 cursor-not-allowed"
                : "text-slate-700"
            }`}
          >
            {label}
          </label>
        )}

        <MuiTextField
          {...props}
          ref={ref}
          id={inputId}
          disabled={disabled}
          error={error}
          type={!multiline ? inputType : undefined}
          multiline={multiline}
          rows={multiline ? rows ?? 3 : undefined}
          variant="outlined"
          size="small"
          sx={{
            width: "100%",
            "& .MuiInputLabel-root": {
              display: "none",
            },
            "& input::placeholder, & textarea::placeholder": {
              color: "#94a3b8",
              opacity: 1,
            },
            "& .MuiFormHelperText-root": {
              color: error ? undefined : "var(--admin-gray, #64748b)",
              marginLeft: 0,
              marginTop: "4px",
              fontSize: "0.75rem",
            },
            // Matches ui/Dropdown.tsx and ui/AsyncSearchSelect.tsx exactly,
            // so every field in a form reads as one consistent control style.
            "& .MuiOutlinedInput-root": {
              marginTop: 0,
              minHeight: 36,
              fontSize: "0.85rem",
              borderRadius: "var(--border-radius-md, 6px)",
              color: "#0f172a",
              bgcolor: "#ffffff",
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
              "& input::-webkit-calendar-picker-indicator": {
                cursor: "pointer",
              },
            },
            ...sx,
          }}
          slotProps={{
            ...slotProps,
            input: {
              notched: false,
              sx: { color: "#0f172a" },
              endAdornment: isPassword ? (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword((prev) => !prev)}
                    edge="end"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    disabled={disabled}
                    size="small"
                  >
                    {showPassword ? (
                      <RemoveRedEyeOutlined
                        sx={{ fontSize: 20, color: "var(--admin-gray, #64748b)" }}
                      />
                    ) : (
                      <VisibilityOff
                        sx={{ fontSize: 20, color: "var(--admin-gray, #64748b)" }}
                      />
                    )}
                  </IconButton>
                </InputAdornment>
              ) : (
                (slotProps?.input as { endAdornment?: ReactNode })
                  ?.endAdornment
              ),
              ...slotProps?.input,
            },
            htmlInput: {
              ...(isNumber
                ? {
                    inputMode: "numeric",
                    pattern: "[0-9]*",
                  }
                : {}),
              ...slotProps?.htmlInput,
            },
          }}
        />
      </div>
    );
  }
);

TextField.displayName = "TextField";

export default TextField;