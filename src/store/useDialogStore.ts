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
  // Opened from any "View Invoice" action across the app (Projects,
  // Customers' invoice peek, a customer's own Billing tab, Dashboard's
  // recent invoices, a just-generated/converted invoice) - a dialog
  // instead of the old standalone /admin/invoices/:id page, so viewing
  // one never navigates away from wherever that action was clicked.
  | "viewInvoice"
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

export const useDialogStore = create<UIState>((set, get) => ({
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
    // Delay resetting the state to allow the exit animation to complete -
    // but only if nothing else opened a *different* dialog in the
    // meantime (e.g. GenerateInvoice.tsx closing its own "add invoice"
    // dialog and immediately opening the new invoice's "viewInvoice" one -
    // see common/pages/GenerateInvoice.tsx). Without this check, this
    // stale timeout would still fire 300ms later and wipe out that
    // freshly-opened dialog's editingType/editingId, closing it right
    // back out from under the user.
    setTimeout(() => {
      if (!get().isDialogOpen) {
        set({
          editingType: null,
          editingId: null,
          mode: "add",
        });
      }
    }, 300);
  },
}));
