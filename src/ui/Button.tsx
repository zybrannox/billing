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
    gradient: {
      background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)",
      color: "#ffffff",
      boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      "&:hover": {
        background: "linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)",
        boxShadow: "0 2px 4px -1px rgba(0, 0, 0, 0.1)",
      },
      "&:focus-visible": {
        boxShadow: "0 0 0 3px rgba(30, 64, 175, 0.25)",
      },
    },
    blue: {
      backgroundColor: "var(--blue-500, #3b82f6)",
      color: "#ffffff",
      boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      "&:hover": {
        backgroundColor: "var(--blue-600, #2563eb)",
      },
      "&:focus-visible": {
        boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.25)",
      },
    },
    pink: {
      backgroundColor: "var(--red-500, #ef4444)",
      color: "#ffffff",
      boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      "&:hover": {
        backgroundColor: "var(--red-600, #dc2626)",
      },
      "&:focus-visible": {
        boxShadow: "0 0 0 3px rgba(239, 68, 68, 0.25)",
      },
    },
    outline: {
      backgroundColor: "#ffffff",
      color: "text.primary",
      border: "1px solid rgba(0, 0, 0, 0.12)",
      boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      "&:hover": {
        borderColor: "var(--blue-300, #93c5fd)",
        backgroundColor: "var(--blue-50, #eff6ff)",
        color: "var(--blue-600, #2563eb)",
      },
      "&:focus-visible": {
        borderColor: "var(--blue-500, #3b82f6)",
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
      fontSize: "0.75rem",
    },
    medium: {
      height: 36,
      padding: "6px 14px",
      fontSize: "0.85rem",
    },
    large: {
      height: 42,
      padding: "8px 20px",
      fontSize: "0.95rem",
    },
  };

  return (
    <MuiButton
      type={type}
      disabled={disabled}
      {...props}
      sx={{
        textTransform: "none",
        fontWeight: 500,
        borderRadius: "var(--border-radius-md, 6px)",
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