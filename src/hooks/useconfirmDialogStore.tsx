import { create } from "zustand";

interface ConfirmDialogConfig {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm?: () => Promise<void> | void;
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

  onConfirm: () => void;
  onCancel: () => void;

  showDialog: (config: ConfirmDialogConfig) => void;
  closeDialog: () => void;
  setLoading: (loading: boolean) => void;
}

export const useConfirmDialogStore = create<ConfirmDialogState>((set) => ({
  openConfirmDialog: false,
  title: "",
  description: "",
  confirmText: "Yes",
  cancelText: "Cancel",
  loading: false,
  isDestructive: false,

  onConfirm: () => {},
  onCancel: () => set({ openConfirmDialog: false }),

  showDialog: (config) =>
    set(() => ({
      openConfirmDialog: true,
      loading: false,
      title: config.title ?? "Are you sure?",
      description: config.description ?? "Please confirm your action.",
      confirmText: config.confirmText ?? "Yes",
      cancelText: config.cancelText ?? "Cancel",
      isDestructive: config.isDestructive ?? false,

      onConfirm: async () => {
        try {
          set({ loading: true });
          await config.onConfirm?.();
          set({ openConfirmDialog: false });
        } finally {
          set({ loading: false });
        }
      },

      onCancel:
        config.onCancel ??
        (() => set({ openConfirmDialog: false })),
    })),

  closeDialog: () => set({ openConfirmDialog: false, loading: false }),

  setLoading: (loading: boolean) => set({ loading }),
}));
