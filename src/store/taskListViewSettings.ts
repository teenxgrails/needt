import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  EnergyLevel,
  Priority,
  TaskStatus,
  TimePreference,
} from "@/types/task";

export type TaskListGroupBy = "project" | "status" | "none";
export type TaskListColumn =
  "project" | "deadline" | "duration" | "priority" | "status" | "energy";

interface TaskListViewSettings {
  // Sort settings
  sortBy:
    | "dueDate"
    | "startDate"
    | "title"
    | "status"
    | "project"
    | "schedule"
    | "priority"
    | "energyLevel"
    | "preferredTime"
    | "duration";
  sortDirection: "asc" | "desc";

  // Filter settings
  status?: TaskStatus[];
  energyLevel?: EnergyLevel[];
  timePreference?: TimePreference[];
  priority?: Priority[];
  tagIds?: string[];
  search?: string;
  hideUpcomingTasks?: boolean;
  groupBy: TaskListGroupBy;
  visibleColumns: TaskListColumn[];

  // Actions
  setSortBy: (sortBy: TaskListViewSettings["sortBy"]) => void;
  setSortDirection: (direction: TaskListViewSettings["sortDirection"]) => void;
  setGroupBy: (groupBy: TaskListGroupBy) => void;
  setVisibleColumns: (columns: TaskListColumn[]) => void;
  setFilters: (
    filters: Partial<
      Omit<
        TaskListViewSettings,
        | "setSortBy"
        | "setSortDirection"
        | "setGroupBy"
        | "setVisibleColumns"
        | "setFilters"
        | "resetFilters"
      >
    >
  ) => void;
  resetFilters: () => void;
}

const DEFAULT_STATUS_FILTERS = [TaskStatus.TODO, TaskStatus.IN_PROGRESS];

export const useTaskListViewSettings = create<TaskListViewSettings>()(
  persist(
    (set) => ({
      // Initial sort settings
      sortBy: "dueDate",
      sortDirection: "asc",

      // Initial filter settings
      status: DEFAULT_STATUS_FILTERS,
      energyLevel: undefined,
      timePreference: undefined,
      priority: undefined,
      tagIds: undefined,
      search: undefined,
      hideUpcomingTasks: false,
      groupBy: "project",
      visibleColumns: ["project", "deadline", "duration", "priority", "status"],

      // Actions
      setSortBy: (sortBy) => set({ sortBy }),
      setSortDirection: (sortDirection) => set({ sortDirection }),
      setGroupBy: (groupBy) => set({ groupBy }),
      setVisibleColumns: (visibleColumns) => set({ visibleColumns }),
      setFilters: (filters) => set(filters),
      resetFilters: () =>
        set({
          status: DEFAULT_STATUS_FILTERS,
          energyLevel: undefined,
          timePreference: undefined,
          priority: undefined,
          tagIds: undefined,
          search: undefined,
          hideUpcomingTasks: false,
        }),
    }),
    {
      name: "task-list-view-settings-v2",
    }
  )
);
