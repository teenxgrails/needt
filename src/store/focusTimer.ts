import { create } from "zustand";
import { persist } from "zustand/middleware";

import { logger } from "@/lib/logger";

const LOG_SOURCE = "focusTimer";

export type FocusMode = "POMODORO" | "FLOW" | "DEEP_FOCUS";

/** Client mirror of the server FocusSession. The server owns all timing; the
 * client only renders from these fields via `@/lib/focus-timer`. */
export interface FocusSessionSnapshot {
  id: string;
  taskId: string | null;
  mode: FocusMode;
  plannedMinutes: number | null;
  pausedTotalSeconds: number;
  pausedAt: string | null;
  startedAt: string;
  endedAt: string | null;
}

interface StartOptions {
  taskId?: string | null;
  mode: FocusMode;
  plannedMinutes: number | null;
  source?: string;
}

interface FocusTimerStore {
  session: FocusSessionSnapshot | null;
  hydrated: boolean;
  /** Set when a session just completed and we need to prompt the user. */
  pendingCompletion: FocusSessionSnapshot | null;

  fetchActive: () => Promise<void>;
  start: (options: StartOptions) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  /** Stop the session; `completed` marks it a success, `markTaskDone` also
   * completes the bound task. */
  stop: (options?: {
    completed?: boolean;
    markTaskDone?: boolean;
  }) => Promise<void>;
  /** Called by the ticking hook when a countdown reaches zero. */
  handleElapsed: () => void;
  clearPendingCompletion: () => void;
}

async function post(body: Record<string, unknown>) {
  const response = await fetch("/api/focus/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`focus session ${body.action} failed`);
  return (await response.json()) as { session: FocusSessionSnapshot | null };
}

export const useFocusTimerStore = create<FocusTimerStore>()(
  persist(
    (set, get) => ({
      session: null,
      hydrated: false,
      pendingCompletion: null,

      fetchActive: async () => {
        try {
          const response = await fetch("/api/focus/session");
          if (response.ok) {
            const data = (await response.json()) as {
              session: FocusSessionSnapshot | null;
            };
            set({ session: data.session ?? null, hydrated: true });
            return;
          }
        } catch (error) {
          logger.error(
            "Failed to fetch active focus session",
            { error: error instanceof Error ? error.message : String(error) },
            LOG_SOURCE
          );
        }
        set({ hydrated: true });
      },

      start: async (options) => {
        const { session } = await post({
          action: "start",
          taskId: options.taskId ?? null,
          mode: options.mode,
          plannedMinutes: options.plannedMinutes,
          source: options.source ?? "web",
        });
        set({ session, pendingCompletion: null });
      },

      pause: async () => {
        const current = get().session;
        if (!current) return;
        const { session } = await post({
          action: "pause",
          sessionId: current.id,
        });
        set({ session });
      },

      resume: async () => {
        const current = get().session;
        if (!current) return;
        const { session } = await post({
          action: "resume",
          sessionId: current.id,
        });
        set({ session });
      },

      stop: async (options) => {
        const current = get().session;
        if (!current) return;
        await post({
          action: "stop",
          sessionId: current.id,
          completed: options?.completed ?? false,
          markTaskDone: options?.markTaskDone ?? false,
        });
        set({ session: null, pendingCompletion: null });
      },

      handleElapsed: () => {
        const current = get().session;
        if (!current || current.plannedMinutes == null) return;
        // Surface the completion prompt and finalize the session as completed.
        set({ pendingCompletion: current });
        void get().stop({ completed: true });
      },

      clearPendingCompletion: () => set({ pendingCompletion: null }),
    }),
    {
      name: "focus-timer-storage",
      // Only the id is persisted; the authoritative session is re-fetched from
      // the server on load so timing survives reloads without trusting the
      // client clock.
      partialize: (state) => ({
        session: state.session ? { id: state.session.id } : null,
      }),
    }
  )
);
