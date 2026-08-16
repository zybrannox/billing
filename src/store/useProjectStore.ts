import { create } from "zustand";
import { apiService } from "../api/service";

export interface FileObject {
  path: string;
  width?: number | null;
  height?: number | null;
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
}
interface ProjectState {
  projects: Project[];
  selectedProject: Project | null;
  addProject: (project: Project) => void;
  setProjects: (projects: Project[]) => void;
  deleteProject: (id: string) => Promise<void>;
  downloadProject: (
    id: string,
    onProgress?: (progress: { percent: number | null; loaded: number }) => void,
  ) => Promise<void>;
  setSelectedProject: (project: Project | null) => void;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProjects: (ids: string[]) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  selectedProject: null,

  /** GET */
  fetchProjects: async () => {
    const projects = await apiService.get<Project[]>("/projects");
    set({ projects });
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
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...data } : p,
      ),
    }));
  },

  setProjects: (projects) => set({ projects }),

  /** DELETE */
  deleteProject: async (id) => {
    await apiService.delete(`/projects/${id}`);
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
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
        return;
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
    } catch (error) {
      console.error("Download failed", error);
    }
  },

  setSelectedProject: (project) => set({ selectedProject: project }),

  /** BULK DELETE */
  deleteProjects: async (ids) => {
    const numericIds = ids.map((id) => Number(id));
    await apiService.post("/projects/bulk-delete", { ids: numericIds });
    set((state) => ({
      projects: state.projects.filter((p) => !ids.includes(String(p.id))),
    }));
  },
}));
