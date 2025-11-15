import { create } from "zustand";

export interface Project {
  _id: string;
  name: string;
  assignee: string;
  delivery: string;
  priority: string;
  client_status: string;
  description: string;
  started: string;
  status: string;
  images: string[];
}

interface ProjectState {
  projects: Project[];
  addProject: (project: Project) => void;
  setProjects: (projects: Project[]) => void; // <-- new
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  addProject: (project) =>
    set((state) => ({ projects: [...state.projects, project] })),
  setProjects: (projects) => set({ projects }), // <-- new
}));

