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
  // Opened either from a project's own "Design completed" row action (id
  // already known - see GenerateInvoice.tsx) or from the admin topbar's
  // "Create Invoice" shortcut (see admin/Layout.tsx) with no id at all, in
  // which case GenerateInvoice shows its own project picker first. Both
  // paths land on the exact same form, so there's only one "create an
  // invoice" implementation to keep in sync.
  | "invoiceDesignComplete"
  // Opened from the admin topbar's "Create Quotation" shortcut (see
  // admin/Layout.tsx) - a pre-invoice estimate for a customer, with no
  // project involved at all (see GenerateQuotation.tsx).
  | "quotation"
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
