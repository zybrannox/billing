import React, { useState } from "react";
import {
  TextField as MuiTextField,
  type TextFieldProps,
  IconButton,
  InputAdornment,
} from "@mui/material";
import { RemoveRedEyeOutlined, VisibilityOff } from "@mui/icons-material";

const TextField = ({
  sx,
  type = "text",
  multiline = false,
  label,
  rows,
  ...props
}: TextFieldProps) => {
  const [showPassword, setShowPassword] = useState(false);

  // Only toggle password visibility if it's a password type
  const isPassword = type === "password";
  const isNumber = type === "number";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div>
      <label className="text-sm text-black mb-2 block text-left">{label}</label>
      <MuiTextField
        {...props}
        type={!multiline ? inputType : undefined}
        multiline={multiline}
        rows={multiline ? (rows ?? 3) : undefined}
        variant="outlined"
        size="small"
        sx={{
          width: "100%",
          borderColor: "var(--border-color)",
          borderWidth: "2px",
          "& .MuiInputLabel-root": {
            position: "static",
            transform: "none",
            fontSize: "0.875rem",
            lineHeight: "calc(1.25 / 0.875)",
            color: "#e6ecf0",
            marginBottom: "4px",
            display: "none",
            transition: "var(--field-transition)",
          },
          "& input::placeholder, & textarea::placeholder": {
            color: "gray",
            opacity: 1, // important for Firefox
          },
          "& .MuiFormHelperText-root": {
            color: "var(--admin-gray)", // helper text color
            marginLeft: 0,
          },
          "& .MuiInputLabel-root.Mui-focused": {
            color: "#fff !important", // label when focused
          },
          "& .MuiOutlinedInput-root": {
            marginTop: 0,
            // backgroundColor: "var(--admin-body-bg)",
            "& fieldset": {
              borderWidth: "1.5px",
              borderColor: "var(--border-color)",
              transition: "var(--field-transition)",
            },
            "&:hover fieldset": {
              borderColor: "var(--border-focus-color)",
              transition: "var(--field-transition)",
            },
            "&.Mui-focused fieldset": {
              borderColor: "var(--border-focus-color)",
              transition: "var(--field-transition)",
            },
            "& input::-webkit-calendar-picker-indicator": {
              filter: "invert(1) brightness(0.5)", // white color
              cursor: "pointer",
              transition: "all 0.3s ease",
            },
            ".MuiSelect-icon": {
              color: "var(--white-40)",
              transition: "var(--field-transition)",
            },
          },
          ...sx,
        }}
        slotProps={{
          // eye icon only for password fields
          // inputLabel: { shrink: false },
          input: {
            notched: false,
            label: false,
            sx: { color: "#000" }, // input text color
            endAdornment: isPassword ? (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword((prev) => !prev)}
                  edge="end"
                  aria-label="toggle password visibility"
                >
                  {showPassword ? (
                    <RemoveRedEyeOutlined sx={{ color: "var(--admin-gray)" }} />
                  ) : (
                    <VisibilityOff sx={{ color: "var(--admin-gray)" }} />
                  )}
                </IconButton>
              </InputAdornment>
            ) : undefined,
          },
          htmlInput: isNumber
            ? {
                inputMode: "numeric",
                pattern: "[0-9]*",
                min: 0,
              }
            : undefined,
        }}
      />
    </div>
  );
};

export default TextField;
// #d3d7dc - input bg
// #e6ecf0 - heading
