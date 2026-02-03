// store/useAppStore.ts
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export type User = {
  username: string;
  role: "admin" | "modurator" | "user";
};

type AppState = {
  user: User | null;
  theme: "light" | "dark";

  setUser: (user: User) => void;
  clearUser: () => void;
  toggleTheme: () => void;
};

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        theme: "light",

        setUser: (user) => set({ user }),
        clearUser: () => set({ user: null }),

        toggleTheme: () =>
          set((state) => ({
            theme: state.theme === "light" ? "dark" : "light",
          })),
      }),
      {
        name: "app-storage",
        partialize: (state) => ({
          user: state.user,
          theme: state.theme,
        }),
      }
    ),
    { name: "AppStore" }
  )
);
