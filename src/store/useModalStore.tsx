import { create } from "zustand";

interface ModalState {
  images: string[];
  open: boolean;
  showImages: (imgs: string[]) => void;
  close: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  images: [],
  open: false,
  showImages: (imgs) => set({ images: imgs, open: true }),
  close: () => set({ open: false, images: [] }),
}));
