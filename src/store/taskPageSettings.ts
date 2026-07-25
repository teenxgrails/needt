import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ViewMode =
  | "space"
  | "list"
  | "board"
  | "deadlines"
  | "timeline"
  | "mail";

interface TaskPageSettings {
  // View settings
  viewMode: ViewMode;

  // Actions
  setViewMode: (mode: ViewMode) => void;
}

export const useTaskPageSettings = create<TaskPageSettings>()(
  persist(
    (set) => ({
      // Initial view settings
      viewMode: "space",

      // Actions
      setViewMode: (viewMode) => set({ viewMode }),
    }),
    {
      name: "task-page-settings",
    }
  )
);
