import { create } from "zustand";

export interface DownloadEntry {
  id: string;
  label: string;
  percent: number | null; // null = server didn't report a total size
  loaded: number;
  total: number | null; // total bytes, when known (single-file downloads always know it; a streamed zip doesn't)
  fileCount: number | null; // how many files this download represents, when known (e.g. "download all")
  done: boolean;
}

interface DownloadProgressState {
  // A list, not a single slot - downloads can genuinely overlap (e.g.
  // downloading one file then quickly navigating and downloading the next
  // via the lightbox's keyboard shortcut), and a single-slot store would
  // have one download's finish() clobber another's still-in-progress card.
  downloads: DownloadEntry[];
  start: (id: string, label: string, fileCount?: number) => void;
  update: (
    id: string,
    progress: { percent: number | null; loaded: number; total?: number | null },
  ) => void;
  // Success path: marks the entry done (shows a brief "Done" state) rather
  // than removing it immediately, so a fast download is still perceptible
  // instead of flashing on and off faster than it can be registered.
  // DownloadProgressIndicator removes it a moment later.
  finish: (id: string) => void;
  // Failure/cancel path: remove immediately, no "Done" state to show.
  remove: (id: string) => void;
}

export const useDownloadProgressStore = create<DownloadProgressState>(
  (set) => ({
    downloads: [],

    start: (id, label, fileCount) =>
      set((state) => ({
        downloads: [
          ...state.downloads.filter((d) => d.id !== id),
          {
            id,
            label,
            percent: 0,
            loaded: 0,
            total: null,
            fileCount: fileCount ?? null,
            done: false,
          },
        ],
      })),

    update: (id, { percent, loaded, total }) =>
      set((state) => ({
        downloads: state.downloads.map((d) =>
          d.id === id
            ? { ...d, percent, loaded, total: total ?? d.total }
            : d,
        ),
      })),

    finish: (id) =>
      set((state) => ({
        downloads: state.downloads.map((d) =>
          d.id === id ? { ...d, percent: 100, done: true } : d,
        ),
      })),

    remove: (id) =>
      set((state) => ({
        downloads: state.downloads.filter((d) => d.id !== id),
      })),
  }),
);
