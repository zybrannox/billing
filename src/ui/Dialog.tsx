import * as React from "react";
import { IconButton, Dialog as MuiDialog } from "@mui/material";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import CloseIcon from "@mui/icons-material/Close";
import { useDialogStore } from "../store/useDialogStore";
import type { FieldDefinition } from "../common/components/CustomForm";
import CustomForm from "../common/components/CustomForm";


// ----------------------------------------------------------------------
// Types & Interfaces
// ----------------------------------------------------------------------

export interface GenericDialogProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children?: React.ReactNode;
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false;
  fullWidth?: boolean;
}

interface ConnectedDialogProps {
  title: string;
  formFields?: FieldDefinition[];
  apiEndPoint?: string;
  initialValues?: Record<string, unknown>; // EDIT SUPPORT
  children?: React.ReactNode;
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
  children,
  maxWidth = false,
  fullWidth = false,
}: GenericDialogProps) {
  return (
    <MuiDialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      aria-labelledby="dialog-title"
      sx={{
        "& .MuiPaper-root": {
          backgroundColor: "#fff",
          color: "var(--admin-text-white)",
          width: maxWidth ? undefined : "30rem", // Default width if no maxWidth is set
          borderRadius: "var(--border-radius-2xl)",
        },
      }}
    >
      <DialogTitle
        id="dialog-title"
        sx={{
          mb: 0,
          p: 2,
          color: "var(--blue-800)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundImage: "var(--admin-bgimg-blue)",
        }}
      >
        <span className="text-xl">{title}</span>
        <IconButton
          onClick={onClose}
          aria-label="close"
          sx={{
            color: "var(--admin-text-white)",
            backgroundColor: "#000",
            padding: "4px",
            "&:hover": { opacity: 0.7 },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={{
          border: "1px solid #000",
          borderRadius: "var(--border-radius-xl)",
          mx: 2,
          mb: 2,
        p: "16px !important",
        }}
      >
        {children}
      </DialogContent>
    </MuiDialog>
  );
}

// ----------------------------------------------------------------------
// Store-Connected Component (Backward Compatible)
// ----------------------------------------------------------------------

export default function Dialog({
  title,
  formFields,
  apiEndPoint,
  initialValues,
  children,
  maxWidth = "sm",
  fullWidth = true,
}: ConnectedDialogProps) {
  const { isDialogOpen, closeDialog, mode } = useDialogStore();

  const dialogTitleMap: Record<string, string> = {
    add: `Add ${title}`,
    edit: `Edit ${title}`,
    view: `View ${title}`,
  };

  const displayTitle = dialogTitleMap[mode] || title;

  return (
    <GenericDialog
      open={isDialogOpen}
      onClose={closeDialog}
      title={displayTitle}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
    >
      {/* Optional Children Content */}
      {children && (
        <div style={{ marginBottom: "20px", textAlign: "center" }}>
          {children}
        </div>
      )}

      {/* Dynamic Form Rendering */}
      {formFields && apiEndPoint && (
        <CustomForm
          fields={formFields}
          apiEndpoint={apiEndPoint}
          initialValues={initialValues}
          readOnly={mode === "view"}
        />
      )}
    </GenericDialog>
  );
}
