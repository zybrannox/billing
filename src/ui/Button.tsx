import { Button as MuiButton, type ButtonProps } from "@mui/material";

interface CustomButtonProps extends ButtonProps {
  variantColor?: "gradient" | "blue" | "pink" | "transparent";
  size?: "small" | "medium" | "large";
}

const Button = ({
  sx,
  size = "medium",
  variantColor = "gradient",
  ...props
}: CustomButtonProps) => {
  const variants = {
    gradient: {
      background: "linear-gradient(to bottom right, #1e3a8a, #1e40af)", // blue-900 → blue-800
      "&:hover": {
        filter: "brightness(1.1)",
      },
    },
    blue: {
      backgroundColor: "#1976d2",
      "&:hover": {
        backgroundColor: "#115293",
      },
    },
    pink: {
      backgroundColor: "#e91e63",
      "&:hover": {
        backgroundColor: "#c2185b",
      },
    },
    transparent: {
      backgroundColor: "transparent",
      color: "#000",
      boxShadow: "none",
      "&:hover": {
        backgroundColor: "rgba(0, 0, 0, 0.04)",
      },
    },
  };

  const sizeStyles = {
    small: {
      padding: "4px 12px",
      fontSize: "0.75rem",
    },
    medium: {
      padding: "8px 20px",
      fontSize: "0.875rem",
    },
    large: {
      padding: "12px 28px",
      fontSize: "1rem",
    },
  };

  return (
    <MuiButton
      {...props}
      sx={{
        color: "#fff",
        float: "right",
        fontWeight: 500,
        borderRadius: "8px",
        transition: "filter 200ms ease, background 200ms ease",
        textTransform: "none",
        ...variants[variantColor],
        ...sizeStyles[size],
        ...sx,
      }}
    />
  );
};

export default Button;
