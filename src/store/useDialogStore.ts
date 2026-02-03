import { create } from "zustand";

type EditingType =
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
