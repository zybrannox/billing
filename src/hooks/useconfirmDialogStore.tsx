import { create } from "zustand";

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

      onConfirm: async () => {
        try {
          set({ loading: true });
          await config.onConfirm?.(get().paymentMethod || undefined);
          set({ openConfirmDialog: false });
        } finally {
          set({ loading: false });
        }
      },

      onCancel:
        config.onCancel ??
        (() => set({ openConfirmDialog: false })),
    })),

  closeDialog: () => set({ openConfirmDialog: false, loading: false, paymentMethodRequired: false, paymentMethod: "" }),

  setLoading: (loading: boolean) => set({ loading }),
}));
