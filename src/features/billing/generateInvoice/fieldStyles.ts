export const numberFieldSx = {
  "& .MuiInputBase-root": {
    px: 1,
    height: 40,
    fontSize: "var(--fs-md)",
  },
  "& input": {
    textAlign: "right" as const,
    px: 0.5,
    py: 0.75,
  },
  "& input[type=number]": {
    MozAppearance: "textfield" as const,
  },
  "& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button": {
    WebkitAppearance: "none",
    margin: 0,
  },
  "& .MuiInputAdornment-root": {
    m: 0,
    "& .MuiTypography-root": {
      fontSize: "var(--fs-xs)",
      color: "var(--slate-500)",
      fontWeight: 600,
    },
  },
};

export const textFieldSx = {
  "& .MuiInputBase-root": {
    px: 1.25,
    height: 40,
    fontSize: "var(--fs-md)",
  },
  "& input": {
    py: 0.75,
  },
};
