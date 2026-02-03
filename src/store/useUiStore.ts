import { create } from "zustand";
import { devtools } from "zustand/middleware";


type UiState = {
  menuAnchorEl: HTMLElement | null;
  openMenu: (el: HTMLElement) => void;
  closeMenu: () => void;
};

export const useUiStore = create<UiState>()(
  devtools((set) => ({
    menuAnchorEl: null,
    openMenu: (el) => set({ menuAnchorEl: el }),
    closeMenu: () => set({ menuAnchorEl: null }),
  }))
);

