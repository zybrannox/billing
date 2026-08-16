import { create } from "zustand";

interface DownloadProgressState {
  active: boolean;
  label: string;
  percent: number | null; // null = server didn't report a total size
  loaded: number;
  start: (label: string) => void;
  update: (progress: { percent: number | null; loaded: number }) => void;
  finish: () => void;
}

export const useDownloadProgressStore = create<DownloadProgressState>(
  (set) => ({
    active: false,
    label: "",
    percent: null,
    loaded: 0,

    start: (label) => set({ active: true, label, percent: 0, loaded: 0 }),
    update: ({ percent, loaded }) => set({ percent, loaded }),
    finish: () => set({ active: false, percent: null, loaded: 0 }),
  }),
);
