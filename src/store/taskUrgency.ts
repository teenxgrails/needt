import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * User-configurable thresholds (in hours) that drive the urgency circle colors
 * in the "today's tasks" panel. A task due within `redThresholdHours` (or
 * already overdue) is red; due within `yellowThresholdHours` is yellow;
 * anything further out is green.
 *
 * Persisted client-side only (localStorage) - these are lightweight UI
 * preferences, so we avoid a DB migration for them.
 */
export interface TaskUrgencyState {
  redThresholdHours: number;
  yellowThresholdHours: number;
  setRedThresholdHours: (hours: number) => void;
  setYellowThresholdHours: (hours: number) => void;
  reset: () => void;
}

// Sensible defaults: red <= 2h or overdue, yellow <= ~today's end, green beyond.
const DEFAULTS = {
  redThresholdHours: 2,
  yellowThresholdHours: 24,
};

export const useTaskUrgencyStore = create<TaskUrgencyState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setRedThresholdHours: (hours) =>
        set({ redThresholdHours: Math.max(0, hours) }),
      setYellowThresholdHours: (hours) =>
        set({ yellowThresholdHours: Math.max(0, hours) }),
      reset: () => set({ ...DEFAULTS }),
    }),
    {
      name: "task-urgency-store",
    }
  )
);
