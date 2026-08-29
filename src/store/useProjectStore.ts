import { create } from "zustand";
import { apiService } from "../api/service";

export interface FileObject {
  path: string;
  // The name the user actually uploaded with - `path` is a UUID-based
  // storage name (collision-proof on disk) and must never be shown as
  // "the filename". Optional because entries saved before this field
  // existed won't have it - display falls back to `path` for those.
  original_name?: string | null;
  width?: number | null;
  height?: number | null;
  // Server-side source of truth - set by the /files/download endpoints, so
  // every user sees the same "downloaded" state, not just the browser that
  // downloaded it.
  downloaded?: boolean | null;
}

export interface Project {
  id: string;
  project_type: string;
  assigned_to: string;
  delivery_date: string;
  start_date: string;
  priority: string;
  client_status: string;
  print_status: string;
  file_paths?: (string | FileObject)[];
  description: string;
  // Order-lifecycle milestones - server-set (see PATCH /design-completed,
  // /print-completed and /delivered), null until reached. `*_by` is the
  // username that triggered it.
  design_completed_at?: string | null;
  design_completed_by?: string | null;
  print_completed_at?: string | null;
  print_completed_by?: string | null;
  delivered_at?: string | null;
  delivered_by?: string | null;
  customer_id?: number | null;
  customer_name?: string | null;
  // Pinned projects sort to the top of the list server-side (see
  // GET /projects) - toggled via PATCH /projects/{id}/pin.
  pinned?: boolean;
}

export interface ProjectListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  printStatus?: string;
  priority?: string;
  customerId?: string | number;
}

interface ProjectListResponse {
  items: Project[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface ProjectState {
  projects: Project[];
  projectsTotal: number;
  projectsPage: number;
  projectsPageSize: number;
  projectsTotalPages: number;
  projectsLoading: boolean;
  selectedProject: Project | null;
  addProject: (project: Project) => void;
  setProjects: (projects: Project[]) => void;
  fetchProjects: (params?: ProjectListParams) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  downloadProject: (
    id: string,
    onProgress?: (progress: {
      percent: number | null;
      loaded: number;
      total: number | null;
    }) => void,
  ) => Promise<boolean>;
  setSelectedProject: (project: Project | null) => void;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProjects: (ids: string[]) => Promise<void>;
  // Re-fetches one project from the server (e.g. after a download that just
  // flipped its files' `downloaded` flag server-side) and syncs it into both
  // `selectedProject` and the `projects` list, if present in either.
  refreshProject: (id: string) => Promise<void>;
  markDesignCompleted: (id: string) => Promise<void>;
  markPrintCompleted: (id: string) => Promise<void>;
  markDelivered: (id: string) => Promise<void>;
  togglePinProject: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  projectsTotal: 0,
  projectsPage: 1,
  projectsPageSize: 10,
  projectsTotalPages: 0,
  projectsLoading: false,
  selectedProject: null,

  /** GET (server-side paginated/searched/filtered - see backend GET /projects/) */
  fetchProjects: async (params = {}) => {
    set({ projectsLoading: true });
    try {
      const res = await apiService.get<ProjectListResponse>("/projects", {
        params: {
          page: params.page ?? 1,
          page_size: params.pageSize ?? 10,
          search: params.search || undefined,
          print_status: params.printStatus || undefined,
          priority: params.priority || undefined,
          customer_id: params.customerId || undefined,
        },
      });
      set({
        projects: res.items,
        projectsTotal: res.total,
        projectsPage: res.page,
        projectsPageSize: res.page_size,
        projectsTotalPages: res.total_pages,
      });
    } finally {
      set({ projectsLoading: false });
    }
  },

  /** POST */
  addProject: async (data) => {
    const newProject = await apiService.post<Project>("/projects", data);
    set((state) => ({ projects: [...state.projects, newProject] }));
    return newProject;
  },

  /** PUT / PATCH */
  updateProject: async (id, data) => {
    await apiService.put(`/projects/${id}`, data);
    // String(...) both sides - `p.id` is a raw number straight off the API
    // response (the `id: string` in the Project type above doesn't actually
    // convert it), while callers pass the DataGrid row's stringified id.
    // `p.id === id` was therefore always false: the PUT above persisted
    // correctly, but this local patch silently never applied, leaving the
    // grid showing stale data until a full refetch. Same normalization
    // markDesignCompleted/markDelivered below already use.
    set((state) => ({
      projects: state.projects.map((p) =>
        String(p.id) === String(id) ? { ...p, ...data } : p,
      ),
    }));
  },

  setProjects: (projects) => set({ projects }),

  /** DELETE */
  deleteProject: async (id) => {
    await apiService.delete(`/projects/${id}`);
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      projectsTotal: Math.max(0, state.projectsTotal - 1),
    }));
  },

  /** DOWNLOAD */
  downloadProject: async (id, onProgress) => {
    try {
      const data = await apiService.getWithProgress<Blob>(
        `/files/download/project/${id}`,
        onProgress ?? (() => {}),
        { responseType: "blob" },
      );

      // 2. 'data' is now the Blob itself because apiService returns res.data
      if (!(data instanceof Blob)) {
        console.error("Downloaded data is not a blob", data);
        return false;
      }

      // 3. Create download link
      const url = window.URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `project_${id}_files.zip`);
      document.body.appendChild(link);
      link.click();

      // 4. Cleanup
      link.remove();
      window.URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error("Download failed", error);
      return false;
    }
  },

  setSelectedProject: (project) => set({ selectedProject: project }),

  /** Re-sync one project from the server after a server-side change. */
  refreshProject: async (id) => {
    const updated = await apiService.get<Project>(`/projects/${id}`);
    const current = get().selectedProject;
    set((state) => ({
      selectedProject:
        current && String(current.id) === String(id) ? updated : current,
      projects: state.projects.map((p) =>
        String(p.id) === String(id) ? updated : p,
      ),
    }));
  },

  /** Order-lifecycle milestones - server sets the timestamp/actor, never the client. */
  markDesignCompleted: async (id) => {
    const updated = await apiService.patch<Project>(
      `/projects/${id}/design-completed`,
    );
    const current = get().selectedProject;
    set((state) => ({
      selectedProject:
        current && String(current.id) === String(id) ? updated : current,
      projects: state.projects.map((p) =>
        String(p.id) === String(id) ? updated : p,
      ),
    }));
  },

  markPrintCompleted: async (id) => {
    const updated = await apiService.patch<Project>(
      `/projects/${id}/print-completed`,
    );
    const current = get().selectedProject;
    set((state) => ({
      selectedProject:
        current && String(current.id) === String(id) ? updated : current,
      projects: state.projects.map((p) =>
        String(p.id) === String(id) ? updated : p,
      ),
    }));
  },

  markDelivered: async (id) => {
    const updated = await apiService.patch<Project>(
      `/projects/${id}/delivered`,
    );
    const current = get().selectedProject;
    set((state) => ({
      selectedProject:
        current && String(current.id) === String(id) ? updated : current,
      projects: state.projects.map((p) =>
        String(p.id) === String(id) ? updated : p,
      ),
    }));
  },

  // Updates the row in place for instant feedback (pin icon flips right
  // away), but pin also changes sort order server-side - the caller
  // (Projects.tsx) follows this with a real refetch of the current page so
  // the row actually moves to/from the top instead of just showing a
  // pinned icon in its old position until some unrelated action happens
  // to reload the list.
  togglePinProject: async (id) => {
    const updated = await apiService.patch<Project>(`/projects/${id}/pin`);
    const current = get().selectedProject;
    set((state) => ({
      selectedProject:
        current && String(current.id) === String(id) ? updated : current,
      projects: state.projects.map((p) =>
        String(p.id) === String(id) ? updated : p,
      ),
    }));
  },

  /** BULK DELETE */
  deleteProjects: async (ids) => {
    const numericIds = ids.map((id) => Number(id));
    await apiService.post("/projects/bulk-delete", { ids: numericIds });
    set((state) => ({
      projects: state.projects.filter((p) => !ids.includes(String(p.id))),
      projectsTotal: Math.max(0, state.projectsTotal - ids.length),
    }));
  },
}));
