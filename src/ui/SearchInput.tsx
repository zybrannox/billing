import { TextField, InputAdornment, type TextFieldProps } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

type SearchInputProps = Omit<TextFieldProps, "variant" | "size"> & {
  // Add any custom props here if needed
};

export default function SearchInput({
  placeholder = "Search...",
  sx,
  InputProps,
  ...props
}: SearchInputProps) {
  return (
    <TextField
      size="small"
      placeholder={placeholder}
      variant="outlined"
      {...props}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} />
          </InputAdornment>
        ),
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
