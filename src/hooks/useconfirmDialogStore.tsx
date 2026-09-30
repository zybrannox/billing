import { create } from "zustand";
import { getApiErrorMessage } from "../utils/apiError";

interface ConfirmDialogConfig {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  // When set, the dialog also collects a payment method before the
  // confirm button is enabled (see CustomerProfile.tsx's "Mark Paid" -
  // marking an invoice paid always has to say how it was actually paid,
  // matching the dedicated PATCH /invoices/{id}/mark-paid endpoint this
  // feeds, which requires payment_method too).
  paymentMethodRequired?: boolean;
  onConfirm?: (paymentMethod?: string) => Promise<void> | void;
  onCancel?: () => void;
}

interface ConfirmDialogState {
  openConfirmDialog: boolean;
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  loading: boolean;
  isDestructive: boolean;
  paymentMethodRequired: boolean;
  paymentMethod: string;
  // Surfaced inline in the dialog when config.onConfirm rejects (e.g. the
  // backend refusing a delete with a 400 - "this project has already been
  // invoiced") - without this, onConfirm's catch below had nothing to show
  // it in, and the dialog just sat there looking like the click did
  // nothing.
  error: string;

  onConfirm: () => void;
  onCancel: () => void;
  setPaymentMethod: (paymentMethod: string) => void;

  showDialog: (config: ConfirmDialogConfig) => void;
  closeDialog: () => void;
  setLoading: (loading: boolean) => void;
}

export const useConfirmDialogStore = create<ConfirmDialogState>((set, get) => ({
  openConfirmDialog: false,
  title: "",
  description: "",
  confirmText: "Yes",
  cancelText: "Cancel",
  loading: false,
  isDestructive: false,
  paymentMethodRequired: false,
  paymentMethod: "",
  error: "",

  onConfirm: () => {},
  onCancel: () => set({ openConfirmDialog: false }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),

  showDialog: (config) =>
    set(() => ({
      openConfirmDialog: true,
      loading: false,
      title: config.title ?? "Are you sure?",
      description: config.description ?? "Please confirm your action.",
      confirmText: config.confirmText ?? "Yes",
      cancelText: config.cancelText ?? "Cancel",
      isDestructive: config.isDestructive ?? false,
      paymentMethodRequired: config.paymentMethodRequired ?? false,
      paymentMethod: "",
      error: "",

      onConfirm: async () => {
        try {
          set({ loading: true, error: "" });
          await config.onConfirm?.(get().paymentMethod || undefined);
          set({ openConfirmDialog: false });
        } catch (err) {
          // Leave the dialog open with the actual reason instead of just
          // resetting loading and going quiet - a rejected delete (already
          // invoiced, still has projects on file, etc.) otherwise looks
          // indistinguishable from the click not registering at all.
          set({ error: getApiErrorMessage(err, "Something went wrong. Please try again.") });
        } finally {
          set({ loading: false });
        }
      },

      onCancel:
        config.onCancel ??
        (() => set({ openConfirmDialog: false })),
    })),

  closeDialog: () => set({ openConfirmDialog: false, loading: false, paymentMethodRequired: false, paymentMethod: "", error: "" }),

  setLoading: (loading: boolean) => set({ loading }),
}));
