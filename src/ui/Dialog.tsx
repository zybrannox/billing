import * as React from "react";
import {
  IconButton,
  Dialog as MuiDialog,
  useMediaQuery,
  useTheme,
  DialogContent,
  DialogTitle,
  Typography,
  Box,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useDialogStore, type EditingType } from "../store/useDialogStore";

// ----------------------------------------------------------------------
// Types & Interfaces
// ----------------------------------------------------------------------

export interface GenericDialogProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false;
  fullWidth?: boolean;
  // Overrides the paper's width outright, bypassing the maxWidth/fullWidth
  // breakpoint sizing below - for content that doesn't map to a form-sized
  // dialog (e.g. a short confirm message, which looks lost/oversized at a
  // full breakpoint width but cramped when left to shrink to content).
  width?: string | number;
}

interface ConnectedDialogProps {
  type: EditingType;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false;
  fullWidth?: boolean;
}

// ----------------------------------------------------------------------
// Generic Reusable Component
// ----------------------------------------------------------------------

export function GenericDialog({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "sm",
  fullWidth = false,
  width,
}: GenericDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <MuiDialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      fullScreen={fullScreen}
      aria-labelledby="dialog-title"
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(4px)",
            transition: "opacity 0.2s ease",
          },
        },
      }}
      sx={{
        "& .MuiDialog-paper": {
          backgroundColor: "#ffffff",
          backgroundImage: "none",
          width: width ?? (maxWidth ? undefined : "30rem"),
          maxWidth: fullScreen ? "100%" : "calc(100% - 32px)",
          borderRadius: fullScreen ? 0 : "var(--border-radius-lg, 16px)",
          boxShadow: fullScreen
            ? "none"
            : "0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)",
          border: fullScreen ? "none" : "1px solid rgba(226, 232, 240, 0.8)",
          overflow: "hidden",
        },
      }}
    >
      {/* Header Section */}
      <DialogTitle
        id="dialog-title"
        component="div"
        sx={{
          py: 2.25,
          px: 3.5,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          borderBottom: "1px solid",
          borderColor: "rgba(226, 232, 240, 0.8)",
          bgcolor: "#f8fafc",
        }}
      >
        <Box sx={{ pr: 2 }}>
          <Typography
            variant="h6"
            component="h2"
            sx={{
              fontSize: "1.125rem",
              fontWeight: 600,
              background: "var(--blue-gradient)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              lineHeight: 1.3,
              letterSpacing: "-0.01em",
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="body2"
              sx={{
                fontSize: "0.8125rem",
                color: "var(--slate-500, #64748b)",
                mt: 0.5,
                lineHeight: 1.4,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>

        <IconButton
          size="small"
          aria-label="Close dialog"
          onClick={onClose}
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
          <CloseIcon sx={{ fontSize: 18 }} />

        </IconButton>
      </DialogTitle>

      {/* Form & Content Area */}
      <DialogContent
        sx={{
          px: 3.5,
          pb: 3,
          // MUI's DialogContent ships a built-in
          // ".MuiDialogTitle-root + .MuiDialogContent-root { padding-top: 0 }"
          // rule (two chained classes) that otherwise beats a plain "py"
          // here (one class) regardless of source order, so content sits
          // flush against the header's bottom border instead of having
          // breathing room under it.
          pt: "24px !important",
          color: "text.primary",
          display: "flex",
          flexDirection: "column",
          gap: 2.5,
          "& .MuiFormControl-root": {
            mb: 0,
          },
          "&::-webkit-scrollbar": {
            width: "6px",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "rgba(0, 0, 0, 0.15)",
            borderRadius: "3px",
          },
        }}
      >
        {children}
      </DialogContent>
    </MuiDialog>
  );
}

// ----------------------------------------------------------------------
// Store-Connected Component
// ----------------------------------------------------------------------

export default function Dialog({
  type,
  title,
  subtitle,
  children,
  maxWidth = "sm",
  fullWidth = false,
}: ConnectedDialogProps) {
  const { isDialogOpen, editingType, closeDialog, mode } = useDialogStore();

  const dialogTitleMap: Record<string, string> = {
    add: `Add ${title}`,
    edit: `Edit ${title}`,
    view: `${title} Details`,
  };

  const displayTitle = dialogTitleMap[mode] || title;

  return (
    <GenericDialog
      open={isDialogOpen && editingType === type}
      onClose={closeDialog}
      title={displayTitle}
      subtitle={subtitle}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
    >
      {children}
    </GenericDialog>
  );
}