"use client";
import { Typography, Box } from "@mui/material";
import { GenericDialog } from "./Dialog";
import Button from "./Button";
import Loader from "./Loader";
import Dropdown from "./Dropdown";

// Mirrors DeliveryCheck.tsx/GenerateInvoice.tsx's own copy - no payment
// gateway anywhere in this app, so this is always a fixed, small set of
// ways an admin manually recorded that money changed hands.
const PAYMENT_METHODS = ["Cash", "UPI", "Bank Transfer", "Card", "Cheque", "Other"];

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  loading?: boolean;
  paymentMethodRequired?: boolean;
  paymentMethod?: string;
  onPaymentMethodChange?: (paymentMethod: string) => void;
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
  paymentMethodRequired = false,
  paymentMethod = "",
  onPaymentMethodChange,
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
          color: "var(--slate-500, var(--slate-500))",
          lineHeight: 1.5,
        }}
      >
        {description}
      </Typography>

      {paymentMethodRequired && (
        <Box sx={{ mt: 0.5 }}>
          <Dropdown
            placeholder="How was this paid?"
            options={PAYMENT_METHODS}
            value={paymentMethod || undefined}
            onChange={(v) => onPaymentMethodChange?.((v as string) || "")}
            disabled={loading}
          />
        </Box>
      )}

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
          disabled={loading || (paymentMethodRequired && !paymentMethod)}
          autoFocus
          sx={{ minWidth: 90 }}
        >
          {loading ? <Loader /> : confirmText}
        </Button>
      </div>
    </GenericDialog>
  );
}
