import React from "react";
import { TextField, InputAdornment, IconButton, type TextFieldProps } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";

type SearchInputProps = Omit<TextFieldProps, "variant" | "size">;

export default function SearchInput({
  placeholder = "Search...",
  sx,
  InputProps,
  value,
  onChange,
  name,
  id,
  ...props
}: SearchInputProps) {
  const hasValue = typeof value === "string" && value.length > 0;

  const handleClear = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!onChange) return;

    // Create a mock change event that maintains full HTMLInputElement contract
    const mockEvent = {
      ...e,
      target: {
        ...e.target,
        name: name || "",
        id: id || "",
        value: "",
      },
      currentTarget: {
        ...e.currentTarget,
        name: name || "",
        id: id || "",
        value: "",
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    onChange(mockEvent);
  };

  return (
    <TextField
      size="small"
      placeholder={placeholder}
      variant="outlined"
      value={value ?? ""}
      onChange={onChange}
      name={name}
      id={id}
      {...props}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start" sx={{ marginRight: 1 }}>
            <SearchIcon
              sx={{
                fontSize: 18,
                color: "var(--blue-400, #94a3b8)",
                transition: "color 0.2s ease",
              }}
            />
          </InputAdornment>
        ),
        // Positioned absolutely to prevent horizontal width shifting when visible
        endAdornment: (
          <InputAdornment
            position="end"
            sx={{
              position: "absolute",
              right: 8,
              opacity: hasValue ? 1 : 0,
              pointerEvents: hasValue ? "auto" : "none",
              transition: "opacity 0.2s ease-in-out, transform 0.2s ease-in-out",
              transform: hasValue ? "scale(1)" : "scale(0.85)",
            }}
          >
            <IconButton
              size="small"
              aria-label="Clear search"
              onClick={handleClear}
              tabIndex={hasValue ? 0 : -1}
              sx={{
                padding: "3px",
                color: "var(--red-600)",
                borderRadius: "var(--border-radius-sm, 4px)",
                transition: "background-color 0.15s ease, color 0.15s ease",
                "&:hover": {
                  bgcolor: "var(--red-50)",
                },
                "&:active": {
                  transform: "scale(0.92)",
                },
              }}
            >
              <CloseIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </InputAdornment>
        ),
        ...InputProps,
        sx: {
          height: 36,
          fontSize: "0.85rem",
          borderRadius: "var(--border-radius-md, 6px)",
          bgcolor: "#ffffff",
          paddingLeft: "10px",
          paddingRight: "32px", // Fixed reserve padding so text doesn't overlap the clear button
          transition: "background-color 0.2s ease, box-shadow 0.2s ease",
          "& input": {
            paddingY: 0,
            textOverflow: "ellipsis",
          },
          ...InputProps?.sx,
        },
      }}
      sx={{
        ...sx,
        "& .MuiOutlinedInput-root": {
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
        },
      }}
    />
  );
}