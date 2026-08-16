import { TextField, InputAdornment, IconButton, type TextFieldProps } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";

type SearchInputProps = Omit<TextFieldProps, "variant" | "size"> & {
  // Add any custom props here if needed
};

export default function SearchInput({
  placeholder = "Search...",
  sx,
  InputProps,
  value,
  onChange,
  ...props
}: SearchInputProps) {
  const hasValue = typeof value === "string" && value.length > 0;

  const handleClear = () => {
    onChange?.({
      target: { value: "" },
    } as React.ChangeEvent<HTMLInputElement>);
  };

  return (
    <TextField
      size="small"
      placeholder={placeholder}
      variant="outlined"
      value={value}
      onChange={onChange}
      {...props}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} />
          </InputAdornment>
        ),
        endAdornment: hasValue ? (
          <InputAdornment position="end">
            <IconButton
              size="small"
              aria-label="Clear search"
              onClick={handleClear}
              sx={{ padding: "2px" }}
            >
              <CloseIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            </IconButton>
          </InputAdornment>
        ) : undefined,
        ...InputProps,
        sx: {
          height: 32,
          fontSize: "0.8rem",
          borderRadius: 2,
          bgcolor: "rgba(0,0,0,0.03)",
          ...InputProps?.sx,
        },
      }}
      sx={{
        ...sx,
        "& .MuiOutlinedInput-notchedOutline": {
          borderColor: "rgba(0,0,0,0.1)",
        },
        "&:hover .MuiOutlinedInput-notchedOutline": {
          borderColor: "rgba(0,0,0,0.2)",
        },
      }}
    />
  );
}
