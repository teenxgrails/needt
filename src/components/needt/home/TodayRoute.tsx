"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import { LuPlus } from "react-icons/lu";

import { useTheme } from "@/components/providers/ThemeProvider";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";

import { format, newDate } from "@/lib/date-utils";
import { isPlanningOverdue } from "@/lib/needt/derive";
import type { NeedtHabit, NeedtProject, NeedtTask } from "@/lib/needt/types";
import { notify } from "@/lib/notifications";
import { updateTaskRequest } from "@/lib/task-api";
import { resolveThemeMode } from "@/lib/theme";
import { useTaskStore } from "@/store/task";

import type { ResolvedThemeMode } from "@/types/settings";

import { MobileHabitStrip, MobileHome } from "../mobile";
import { Glyph } from "../shell/chrome";
import { Home } from "./Home";
import { moveTaskToDay, toggledTaskStatus } from "./today-actions";

interface TodayPayload {
  workspaceId: string;
  now: string;
  tasks: NeedtTask[];
  projects: NeedtProject[];
  habits: NeedtHabit[];
  canEdit: boolean;
}

function useResolvedTheme(): ResolvedThemeMode {
  const { theme, systemTheme } = useTheme();
  const [resolved, setResolved] = React.useState<ResolvedThemeMode>(() =>
    resolveThemeMode(theme, false, systemTheme)
  );

  React.useLayoutEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () =>
      setResolved(resolveThemeMode(theme, media.matches, systemTheme));
    sync();
    if (theme !== "system") return undefined;
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [systemTheme, theme]);

  return resolved;
}

async function readToday(): Promise<TodayPayload> {
  const response = await fetch("/api/needt/today", { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load today");
  return response.json() as Promise<TodayPayload>;
}

export function TodayRoute() {
  const router = useRouter();
  const { activeWorkspace } = useWorkspace();
  const activeWorkspaceId = activeWorkspace?.workspace.id;
  const theme = useResolvedTheme();
  const scheduleAllTasks = useTaskStore((state) => state.scheduleAllTasks);
  const [data, setData] = React.useState<TodayPayload | null>(null);
  const [error, setError] = React.useState(false);
  const pendingTaskIds = React.useRef(new Set<string>());
  const pendingHabitIds = React.useRef(new Set<string>());

  const refresh = React.useCallback(async () => {
    if (!activeWorkspaceId) throw new Error("Workspace unavailable");
    const next = await readToday();
    if (next.workspaceId !== activeWorkspaceId) {
      throw new Error("Workspace changed while loading today");
    }
    setData(next);
    setError(false);
    return next;
  }, [activeWorkspaceId]);

  React.useEffect(() => {
    let current = true;
    setData(null);
    setError(false);
    if (!activeWorkspaceId) return () => undefined;
    void readToday()
      .then((next) => {
        if (current && next.workspaceId === activeWorkspaceId) setData(next);
      })
      .catch(() => {
        if (current) setError(true);
      });
    return () => {
      current = false;
    };
  }, [activeWorkspaceId]);

  const openTask = React.useCallback(
    (task: NeedtTask) =>
      router.push(`/tasks?task=${encodeURIComponent(task.id)}`),
    [router]
  );
  const addTask = React.useCallback(() => router.push("/quick-add"), [router]);

  const toggleTask = React.useCallback(
    async (id: string) => {
      if (!data?.canEdit) return;
      if (pendingTaskIds.current.has(id)) return;
      const task = data.tasks.find((candidate) => candidate.id === id);
      if (!task) return;
      pendingTaskIds.current.add(id);
      setData((current) =>
        current
          ? {
              ...current,
              tasks: current.tasks.map((candidate) =>
                candidate.id === id
                  ? { ...candidate, done: !candidate.done }
                  : candidate
              ),
            }
          : current
      );
      let persisted = false;
      try {
        await updateTaskRequest(id, { status: toggledTaskStatus(task) });
        persisted = true;
        await refresh();
      } catch {
        if (persisted) {
          notify.error("Task updated, but Today could not refresh");
        } else {
          setData((current) =>
            current
              ? {
                  ...current,
                  tasks: current.tasks.map((candidate) =>
                    candidate.id === id ? task : candidate
                  ),
                }
              : current
          );
          notify.error("Could not update this task");
        }
      } finally {
        pendingTaskIds.current.delete(id);
      }
    },
    [data, refresh]
  );

  const toggleHabit = React.useCallback(
    async (id: string, completed: boolean) => {
      if (!data?.canEdit) return;
      if (pendingHabitIds.current.has(id)) return;
      const habit = data.habits.find((candidate) => candidate.id === id);
      if (!habit) return;
      pendingHabitIds.current.add(id);
      const apply = (current: TodayPayload, value: boolean) => ({
        ...current,
        habits: current.habits.map((candidate) => {
          if (candidate.id !== id) return candidate;
          const done = [...candidate.done];
          if (done.length) done[done.length - 1] = value ? 1 : 0;
          else done.push(value ? 1 : 0);
          return { ...candidate, done };
        }),
      });
      setData((current) => (current ? apply(current, completed) : current));
      let persisted = false;
      try {
        const response = await fetch(`/api/habits/${id}/completions/today`, {
          method: completed ? "PUT" : "DELETE",
        });
        if (!response.ok) throw new Error("Could not update habit");
        persisted = true;
        await refresh();
      } catch {
        if (persisted) {
          notify.error("Habit updated, but Today could not refresh");
        } else {
          const previous = Boolean(habit.done[habit.done.length - 1]);
          setData((current) => (current ? apply(current, previous) : current));
          notify.error("Could not update this habit");
        }
      } finally {
        pendingHabitIds.current.delete(id);
      }
    },
    [data, refresh]
  );

  const planDay = React.useCallback(async () => {
    if (!data?.canEdit) return;
    try {
      await scheduleAllTasks();
      await refresh();
      notify.success("Your day is planned");
    } catch {
      notify.error("Could not plan your day");
    }
  }, [data?.canEdit, refresh, scheduleAllTasks]);

  const moveOverdue = React.useCallback(async () => {
    if (!data?.canEdit) return;
    const now = newDate(data.now);
    const updates = data.tasks
      .filter((task) => isPlanningOverdue(task, now))
      .map((task) => ({ task, update: moveTaskToDay(task, now) }))
      .filter(
        (
          item
        ): item is {
          task: NeedtTask;
          update: NonNullable<typeof item.update>;
        } => item.update !== null
      );
    try {
      await Promise.all(
        updates.map(({ task, update }) => updateTaskRequest(task.id, update))
      );
      await refresh();
      notify.success("Overdue tasks moved to today");
    } catch {
      await refresh().catch(() => undefined);
      notify.error("Some overdue tasks could not be moved");
    }
  }, [data, refresh]);

  const shellStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    minHeight: 0,
    background: "var(--background)",
    color: "var(--text-primary)",
    font: "var(--type-ui)",
  };

  if (!data || data.workspaceId !== activeWorkspaceId) {
    return (
      <div className="needt-v2" data-theme={theme} style={shellStyle}>
        <div className="grid flex-1 place-items-center px-6 text-center text-sm text-[var(--text-muted)]">
          {error ? (
            <div>
              <p>Today could not be loaded.</p>
              <button
                type="button"
                className="mt-3 min-h-11 rounded-[var(--radius-lg)] px-4 text-[var(--accent)] shadow-[var(--shadow-ring)]"
                onClick={() => void refresh().catch(() => setError(true))}
              >
                Try again
              </button>
            </div>
          ) : (
            <span role="status">Loading today…</span>
          )}
        </div>
      </div>
    );
  }

  const now = newDate(data.now);
  const canEdit = data.canEdit;
  return (
    <div className="needt-v2" data-theme={theme} style={shellStyle}>
      <div className="hidden min-h-0 flex-1 flex-col px-5 pb-5 sm:flex">
        <Home
          tasks={data.tasks}
          habits={data.habits}
          projects={data.projects}
          now={now}
          form="today"
          showFormSwitcher={false}
          habitsReadOnly={!canEdit}
          onOpenTask={openTask}
          onToggleTask={canEdit ? toggleTask : undefined}
          onToggleHabit={canEdit ? toggleHabit : undefined}
          onAddTask={canEdit ? addTask : undefined}
          onMoveOverdueToToday={canEdit ? moveOverdue : undefined}
          onPlanMyDay={canEdit ? planDay : undefined}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col sm:hidden">
        <header className="flex items-center gap-3 px-4 pb-3 pt-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[var(--text-muted)]">Today</p>
            <h1 className="truncate text-xl font-semibold">
              {format(now, "EEEE, d MMMM")}
            </h1>
          </div>
          {canEdit ? (
            <button
              type="button"
              onClick={addTask}
              aria-label="Add task"
              className="grid size-11 flex-none place-items-center rounded-[var(--radius-floating)] bg-[var(--fill-accent)] text-[var(--accent)]"
            >
              <Glyph of={LuPlus} size={18} />
            </button>
          ) : null}
        </header>
        {data.habits.length ? (
          <MobileHabitStrip
            habits={data.habits}
            projects={data.projects}
            onToggleHabit={canEdit ? toggleHabit : undefined}
            readOnly={!canEdit}
          />
        ) : null}
        <div className="scroll-inner min-h-0 flex-1 overflow-auto">
          <MobileHome
            tasks={data.tasks}
            now={now}
            onOpenTask={openTask}
            onToggleTask={canEdit ? toggleTask : undefined}
            onAddTask={canEdit ? addTask : undefined}
          />
        </div>
      </div>
    </div>
  );
}
