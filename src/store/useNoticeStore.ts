// The notices in the top-right corner that say what just happened: "Project
// added", "Couldn't upload banner.jpg: the connection was lost". Most come from
// one place, the API client (api/actionNotices.ts), so every save, upload and
// delete reports back the same way; a screen can also call `notify` itself.
import { create } from "zustand";

export type NoticeTone = "success" | "error" | "warning" | "info";

export interface NoticeInput {
  tone: NoticeTone;
  title: string;
  message?: string;
  /** A button that opens a page in the app, e.g. the project just added. */
  action?: { label: string; to: string };
  /** Notices with the same group collapse into one ("3 files uploaded"). */
  group?: string;
  groupTitle?: (count: number) => string;
}

export interface Notice extends NoticeInput {
  id: number;
  count: number;
  /** Bumped when a grouped notice is updated, so its timer starts again. */
  version: number;
}

const MAX_SHOWN = 4;
let nextId = 1;

interface NoticeState {
  notices: Notice[];
  push: (notice: NoticeInput) => number;
  dismiss: (id: number) => void;
  clear: () => void;
}

export const useNoticeStore = create<NoticeState>((set, get) => ({
  notices: [],
  push: (input) => {
    const existing = input.group ? get().notices.find((n) => n.group === input.group && n.tone === input.tone) : undefined;
    if (existing) {
      const count = existing.count + 1;
      set((state) => ({
        notices: state.notices.map((n) =>
          n.id === existing.id
            ? { ...n, ...input, count, version: n.version + 1, title: input.groupTitle ? input.groupTitle(count) : input.title }
            : n,
        ),
      }));
      return existing.id;
    }
    const id = nextId++;
    const title = input.groupTitle ? input.groupTitle(1) : input.title;
    // Oldest drop off first; an error is never pushed out by a success.
    set((state) => {
      const notices = [...state.notices, { ...input, title, id, count: 1, version: 0 }];
      while (notices.length > MAX_SHOWN) {
        const drop = notices.findIndex((n) => n.tone !== "error");
        notices.splice(drop === -1 ? 0 : drop, 1);
      }
      return { notices };
    });
    return id;
  },
  dismiss: (id) => set((state) => ({ notices: state.notices.filter((n) => n.id !== id) })),
  clear: () => set({ notices: [] }),
}));

type Options = Omit<NoticeInput, "tone" | "title">;
const push = (tone: NoticeTone) => (title: string, options: Options = {}) =>
  useNoticeStore.getState().push({ tone, title, ...options });

/** Show a notice from anywhere: `notify.success("Project added")`. */
export const notify = {
  success: push("success"),
  error: push("error"),
  warning: push("warning"),
  info: push("info"),
};
