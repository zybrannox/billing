import { create } from "zustand";

export interface Project {
  id: string;
  name: string;
  assignee: string;
  delivery: string;
  priority: string;
  clientStatus: string;
  description: string;
  started: string;
  status: string;
  images: string[];
}

interface ProjectState {
  projects: Project[];
  addProject: (project: Project) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  addProject: (project) =>
    set((state) => ({ projects: [...state.projects, project] })),
}));
