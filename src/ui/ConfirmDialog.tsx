"use client";
import { Typography } from "@mui/material";
import { GenericDialog } from "./Dialog";
import Button from "./Button";
import Loader from "./Loader";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title = "Are you sure?",
  description = "Please confirm your action.",
  confirmText = "Yes",
  cancelText = "Cancel",
  isDestructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <GenericDialog
      open={open}
      onClose={loading ? () => {} : onCancel}
      title={title}
      // A confirm dialog's content (one short line + two buttons) doesn't
      // map to either of GenericDialog's built-in sizing modes: shrinking
      // to content leaves it cramped, and filling the "xs" breakpoint
      // (~444px) leaves a lot of dead space around such a short message.
      // A fixed, snug width fits the actual content instead.
      width="24rem"
    >
      <Typography
        sx={{
          fontSize: "0.875rem",
          color: "var(--slate-500, #64748b)",
          lineHeight: 1.5,
        }}
      >
        {description}
      </Typography>

      <div className="flex justify-end gap-2.5">
        <Button
          variantColor="outline"
          onClick={onCancel}
          disabled={loading}
        >
          {cancelText}
        </Button>

        <Button
          variantColor={isDestructive ? "pink" : "gradient"}
          onClick={onConfirm}
          disabled={loading}
          autoFocus
          sx={{ minWidth: 90 }}
        >
          {loading ? <Loader /> : confirmText}
        </Button>
      </div>
    </GenericDialog>
  );
}
