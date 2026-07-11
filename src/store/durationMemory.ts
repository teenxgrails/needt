import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Normalize a task title into a stable key so that similar tasks share a
 * learned duration. Lower-cases, strips punctuation, and collapses whitespace.
 */
export function normalizeTaskTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Remembers the duration a user chose when starting a task, keyed by the
 * normalized title, so future similar tasks can be prefilled with a similar
 * duration. Persisted client-side (localStorage) - minimal storage per the
 * task brief, reusing the task `duration` field for the actual allocation.
 */
export interface DurationMemoryState {
  memory: Record<string, number>;
  remember: (title: string, minutes: number) => void;
  recall: (title: string) => number | undefined;
}

export const useDurationMemoryStore = create<DurationMemoryState>()(
  persist(
    (set, get) => ({
      memory: {},
      remember: (title, minutes) => {
        const key = normalizeTaskTitle(title);
        if (!key || !Number.isFinite(minutes) || minutes <= 0) return;
        set((state) => ({ memory: { ...state.memory, [key]: minutes } }));
      },
      recall: (title) => {
        const key = normalizeTaskTitle(title);
        return key ? get().memory[key] : undefined;
      },
    }),
    {
      name: "duration-memory-store",
    }
  )
);
