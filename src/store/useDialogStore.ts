import { create } from "zustand";

export type EditingType =
  | "course"
  | "category"
  | "user"
  | "announcements"
  | "banner"
  | "designation"
  | "subCategory"
  | "language"
  | "feedback"
  | "payment_report"
  | "coupon"
  | "faq"
  | "pages"
  | "certificate"
  | "project"
  | "customer"
  // Opened from the "Design completed" row action (see GenerateInvoice.tsx)
  // - the standalone "Invoice" menu action was removed, since generating an
  // invoice from this flow also marks the design done, replacing that
  // action's old plain confirm dialog entirely rather than being a second,
  // redundant way to invoice.
  | "invoiceDesignComplete"
  // Opened from the "Deliver" row action (see DeliveryCheck.tsx) - shows
  // the order's full line-item/payment breakdown instead of a plain
  // "are you sure?" confirm, and is itself the gate on payment being
  // complete before delivery is allowed.
  | "deliveryCheck"
  | "changePassword"
  | null;

type DialogMode = "add" | "edit" | "view";

interface UIState {
  isDialogOpen: boolean;
  editingId: number | string | null;
  editingType: EditingType;
  mode: DialogMode;

  openDialog: (
    type: EditingType,
    id?: UIState["editingId"],
    mode?: DialogMode,
  ) => void;
  closeDialog: () => void;
}

export const useDialogStore = create<UIState>((set) => ({
  isDialogOpen: false,
  editingId: null,
  editingType: null,
  mode: "add",

  openDialog: (type, id = null, mode = id ? "edit" : "add") =>
    set({
      isDialogOpen: true,
      editingType: type,
      editingId: id,
      mode,
    }),

  closeDialog: () => {
    set({ isDialogOpen: false });
    // Delay resetting the state to allow the exit animation to complete
    setTimeout(() => {
      set({
        editingType: null,
        editingId: null,
        mode: "add",
      });
    }, 300);
  },
}));
