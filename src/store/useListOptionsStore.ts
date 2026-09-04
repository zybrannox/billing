import { create } from "zustand";
import { apiService } from "../api/service";

export interface ListOption {
  id: number;
  category: string;
  value: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  // Only set for pricing categories ("item_type" - the invoice line-item
  // catalog, see GenerateInvoice.tsx). Null everywhere else.
  rate: number | null;
}

interface ListOptionsState {
  // Cache keyed by category ("project_type" today, others later - see
  // app/list_options on the backend). List options change rarely (an admin
  // curating a dropdown, not live data) but are read constantly (every form
  // that shows the dropdown), so once a category is fetched it's reused
  // instead of re-fetching on every dialog open - a light client-side
  // cache, not real-time sync, matches how often this data actually moves.
  activeByCategory: Record<string, ListOption[]>;
  allByCategory: Record<string, ListOption[]>;
  loading: boolean;

  // Active-only options for a dropdown picker (e.g. Add Project's Project
  // Type field). Serves from cache unless `force` is passed.
  fetchActiveOptions: (category: string, force?: boolean) => Promise<ListOption[]>;
  // Every option (active + deactivated) for the admin System Setup screen,
  // so a previously-removed value can still be found and reactivated.
  fetchAllOptions: (category: string, force?: boolean) => Promise<ListOption[]>;
  addOption: (category: string, value: string, rate?: number) => Promise<ListOption>;
  setOptionActive: (id: number, category: string, isActive: boolean) => Promise<void>;
}

export const useListOptionsStore = create<ListOptionsState>((set, get) => ({
  activeByCategory: {},
  allByCategory: {},
  loading: false,

  fetchActiveOptions: async (category, force = false) => {
    const cached = get().activeByCategory[category];
    if (cached && !force) return cached;

    const items = await apiService.get<ListOption[]>("/list-options/", {
      params: { category, active_only: true },
    });
    set((state) => ({
      activeByCategory: { ...state.activeByCategory, [category]: items },
    }));
    return items;
  },

  fetchAllOptions: async (category, force = false) => {
    const cached = get().allByCategory[category];
    if (cached && !force) return cached;

    set({ loading: true });
    try {
      const items = await apiService.get<ListOption[]>("/list-options/", {
        params: { category, active_only: false },
      });
      set((state) => ({
        allByCategory: { ...state.allByCategory, [category]: items },
      }));
      return items;
    } finally {
      set({ loading: false });
    }
  },

  // Re-fetches both caches for the category from the server rather than
  // splicing the new/changed row in locally - "add" can silently reactivate
  // an existing deactivated row instead of inserting one (see backend
  // create_option), so a local splice could easily produce a duplicate or
  // miss the reactivation. A refetch is cheap and always correct.
  addOption: async (category, value, rate) => {
    const created = await apiService.post<ListOption>("/list-options/", {
      category,
      value,
      rate,
    });
    await Promise.all([
      get().fetchActiveOptions(category, true),
      get().fetchAllOptions(category, true),
    ]);
    return created;
  },

  setOptionActive: async (id, category, isActive) => {
    await apiService.patch<ListOption>(
      `/list-options/${id}/${isActive ? "reactivate" : "deactivate"}`,
    );
    await Promise.all([
      get().fetchActiveOptions(category, true),
      get().fetchAllOptions(category, true),
    ]);
  },
}));
