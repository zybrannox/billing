import { Button as MuiButton, type ButtonProps } from "@mui/material";

interface CustomButtonProps extends ButtonProps {
  variantColor?: "gradient" | "blue" | "pink" | "transparent" | "outline";
  size?: "small" | "medium" | "large";
}

const Button = ({
  sx,
  size = "medium",
  variantColor = "gradient",
  type = "button",
  disabled,
  ...props
}: CustomButtonProps) => {
  const variants = {
    // The default (primary) button: one solid brand blue, no gradient. The
    // name is kept so existing call sites don't change.
    gradient: {
      backgroundColor: "var(--blue-600)",
      color: "var(--white)",
      boxShadow: "0 1px 2px 0 rgba(15, 23, 42, 0.08)",
      "&:hover": {
        backgroundColor: "var(--blue-700)",
        boxShadow: "0 1px 3px 0 rgba(15, 23, 42, 0.16)",
      },
      "&:focus-visible": {
        boxShadow: "0 0 0 3px rgba(37, 99, 235, 0.25)",
      },
    },
    blue: {
      backgroundColor: "var(--blue-500, var(--blue-500))",
      color: "var(--white)",
      boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      "&:hover": {
        backgroundColor: "var(--blue-600, var(--blue-600))",
      },
      "&:focus-visible": {
        boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.25)",
      },
    },
    pink: {
      backgroundColor: "var(--red-500, var(--red-500))",
      color: "var(--white)",
      boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      "&:hover": {
        backgroundColor: "var(--red-600, var(--red-600))",
      },
      "&:focus-visible": {
        boxShadow: "0 0 0 3px rgba(239, 68, 68, 0.25)",
      },
    },
    outline: {
      backgroundColor: "var(--white)",
      color: "var(--slate-800)",
      border: "1px solid var(--slate-300)",
      boxShadow: "none",
      "&:hover": {
        borderColor: "var(--slate-400)",
        backgroundColor: "var(--slate-50)",
        color: "var(--slate-900)",
      },
      "&:focus-visible": {
        borderColor: "var(--blue-500, var(--blue-500))",
        boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.12)",
      },
    },
    transparent: {
      backgroundColor: "transparent",
      color: "text.primary",
      boxShadow: "none",
      "&:hover": {
        backgroundColor: "rgba(0, 0, 0, 0.04)",
      },
      "&:focus-visible": {
        boxShadow: "0 0 0 3px rgba(0, 0, 0, 0.08)",
      },
    },
  };

  const sizeStyles = {
    small: {
      height: 28,
      padding: "2px 10px",
      fontSize: "var(--fs-xs)",
    },
    medium: {
      height: 36,
      padding: "6px 14px",
      fontSize: "var(--fs-md)",
    },
    large: {
      height: 42,
      padding: "8px 20px",
      fontSize: "var(--fs-xl)",
    },
  };

  return (
    <MuiButton
      type={type}
      disabled={disabled}
      {...props}
      sx={{
        textTransform: "none",
        fontWeight: 600,
        borderRadius: "8px",
        lineHeight: 1.25,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        transition:
          "background-color 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, color 0.15s ease",

        "&.Mui-disabled": {
          bgcolor: "rgba(0, 0, 0, 0.04)",
          color: "rgba(0, 0, 0, 0.26)",
          borderColor: "rgba(0, 0, 0, 0.08)",
          boxShadow: "none",
        },

        ...variants[variantColor],
        ...sizeStyles[size],
        ...sx,
      }}
    />
  );
};

export default Button;