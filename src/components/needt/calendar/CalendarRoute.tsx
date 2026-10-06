"use client";

import * as React from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  LuCalendarPlus,
  LuChevronLeft,
  LuChevronRight,
  LuPlus,
  LuRefreshCw,
} from "react-icons/lu";

import { useTheme } from "@/components/providers/ThemeProvider";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { TaskModal } from "@/components/task-editor/TaskModal";

import {
  addCalendarDays,
  format,
  newDate,
  newDateFromYMD,
  setHours,
  setMinutes,
} from "@/lib/date-utils";
import type {
  NeedtCalendarEntry,
  NeedtCalendarMap,
  NeedtProject,
} from "@/lib/needt/types";
import { notify } from "@/lib/notifications";
import { updateTaskRequest } from "@/lib/task-api";
import { resolveThemeMode } from "@/lib/theme";

import { useTaskMutations } from "@/hooks/useTaskMutations";

import { useViewStore } from "@/store/calendar";
import { useTaskStore } from "@/store/task";

import type { ResolvedThemeMode } from "@/types/settings";
import type { NewTask } from "@/types/task";
import { TaskStatus } from "@/types/task";

import { MobileCalendarDay } from "../mobile";
import { Glyph } from "../shell/chrome";
import { CalendarEventDialog } from "./CalendarEventDialog";
import {
  type CalendarOpts,
  CalendarScreen,
  type CalendarView,
} from "./CalendarScreen";
import { type CalendarEntry, entriesOnDay } from "./entries";

interface CalendarPayload {
  workspaceId: string;
  now: string;
  entries: NeedtCalendarEntry[];
  projects: NeedtProject[];
  calendars: NeedtCalendarMap;
  canEdit: boolean;
  options: CalendarOpts;
}

const VIEWS: readonly CalendarView[] = [
  "day",
  "week",
  "month",
  "columns",
  "sequence",
];

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

async function readCalendar(anchor: Date): Promise<CalendarPayload> {
  const start = addCalendarDays(anchor, -45).toISOString();
  const end = addCalendarDays(anchor, 320).toISOString();
  const response = await fetch(
    `/api/needt/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
    { cache: "no-store" }
  );
  if (!response.ok) throw new Error("Could not load calendar");
  return response.json() as Promise<CalendarPayload>;
}

function dateAt(day: Date, hour: number) {
  const whole = Math.floor(hour);
  const minute = Math.round((hour - whole) * 60);
  return setMinutes(setHours(day, whole), minute);
}

function moveAnchor(date: Date, view: CalendarView, direction: -1 | 1) {
  if (view === "month") {
    return newDateFromYMD(date.getFullYear(), date.getMonth() + direction, 1);
  }
  return addCalendarDays(
    date,
    direction * (view === "day" ? 1 : view === "week" ? 7 : 7)
  );
}

/**
 * What one press of the header arrows moves.
 *
 * The phone canvas is a single day, and the chips that pick week or month are
 * desktop-only, so an arrow has to move a day there. Asked at the moment of
 * the press rather than held in state: a hook reports the breakpoint only
 * after it mounts, so the first presses after a page load moved a week under
 * a screen showing one day — and a second, hidden button would collide with
 * the first by name.
 */
function stepUnit(view: CalendarView): CalendarView {
  const phone =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 639px)").matches;
  return phone ? "day" : view;
}

export function CalendarRoute() {
  const router = useRouter();
  const theme = useResolvedTheme();
  const dark = theme === "dark" || theme === "dim";
  const { activeWorkspace } = useWorkspace();
  const activeWorkspaceId = activeWorkspace?.workspace.id;
  const storedDate = useViewStore((state) => state.date);
  const setStoredDate = useViewStore((state) => state.setDate);
  const storedView = useViewStore((state) => state.view);
  const setStoredView = useViewStore((state) => state.setView);
  const scheduleAllTasks = useTaskStore((state) => state.scheduleAllTasks);
  const scheduleRevision = useTaskStore(
    (state) => state.scheduleAnimationRevision
  );
  const tags = useTaskStore((state) => state.tags);
  const createTag = useTaskStore((state) => state.createTag);
  const fetchTags = useTaskStore((state) => state.fetchTags);
  const { createTask } = useTaskMutations();
  const [view, setView] = React.useState<CalendarView>(() =>
    storedView === "day" || storedView === "week" || storedView === "month"
      ? storedView
      : "week"
  );
  const [data, setData] = React.useState<CalendarPayload | null>(null);
  const [error, setError] = React.useState(false);
  const [eventEntry, setEventEntry] = React.useState<CalendarEntry | null>(
    null
  );
  const [eventOpen, setEventOpen] = React.useState(false);
  const [taskOpen, setTaskOpen] = React.useState(false);
  const pendingTaskIds = React.useRef(new Set<string>());

  React.useEffect(() => {
    if (
      storedView === "day" ||
      storedView === "week" ||
      storedView === "month"
    ) {
      setView(storedView);
    }
  }, [storedView]);

  const refresh = React.useCallback(async () => {
    if (!activeWorkspaceId) throw new Error("Workspace unavailable");
    const next = await readCalendar(storedDate);
    if (next.workspaceId !== activeWorkspaceId) {
      throw new Error("Workspace changed while loading calendar");
    }
    setData(next);
    setError(false);
    return next;
  }, [activeWorkspaceId, storedDate]);

  React.useEffect(() => {
    let current = true;
    setData(null);
    setError(false);
    if (!activeWorkspaceId) return () => undefined;
    void readCalendar(storedDate)
      .then((next) => {
        if (current && next.workspaceId === activeWorkspaceId) setData(next);
      })
      .catch(() => {
        if (current) setError(true);
      });
    return () => {
      current = false;
    };
  }, [activeWorkspaceId, storedDate]);

  /**
   * Scheduling finishes after the write that triggered it.
   *
   * Creating a task returns as soon as the task exists; the placement runs
   * behind it and the store announces the finished run. Without listening for
   * that, a task scheduled into today never appears — the grid still holds
   * what was fetched before the scheduler ran, and only a change of date
   * refetches. A task placed on a later day hid the bug, because stepping to
   * that day refetched on the way.
   */
  const seenRevision = React.useRef(scheduleRevision);
  React.useEffect(() => {
    if (seenRevision.current === scheduleRevision) return;
    seenRevision.current = scheduleRevision;
    void refresh().catch(() => {
      /* The grid keeps what it has; the next navigation will refetch. */
    });
  }, [refresh, scheduleRevision]);

  const selectView = (next: CalendarView) => {
    setView(next);
    if (next === "day" || next === "week" || next === "month") {
      setStoredView(next);
    }
  };

  const openEntry = (entry: CalendarEntry) => {
    if (entry.kind === "busy") return;
    if (entry.kind === "event") {
      setEventEntry(entry);
      setEventOpen(true);
      return;
    }
    router.push(
      `/tasks?task=${encodeURIComponent(entry.sourceId ?? entry.id)}`
    );
  };

  const toggleTask = async (entry: CalendarEntry) => {
    if (!data?.canEdit || entry.kind === "event" || entry.kind === "busy")
      return;
    const taskId = entry.sourceId ?? entry.id;
    if (pendingTaskIds.current.has(taskId)) return;
    pendingTaskIds.current.add(taskId);
    try {
      await updateTaskRequest(
        taskId,
        { status: entry.done ? TaskStatus.TODO : TaskStatus.COMPLETED },
        entry.revision
      );
      await refresh();
    } catch {
      notify.error("Could not update this task");
    } finally {
      pendingTaskIds.current.delete(taskId);
    }
  };

  const persistTaskPlacement = async (
    entry: CalendarEntry,
    day: Date,
    at: number,
    duration = entry.est ?? 30
  ) => {
    if (!data?.canEdit || entry.kind === "event" || entry.kind === "busy")
      return;
    const start = dateAt(day, at);
    const end = newDate(start.getTime() + duration * 60_000);
    await updateTaskRequest(
      entry.sourceId ?? entry.id,
      { scheduledStart: start, scheduledEnd: end, scheduleLocked: true },
      entry.revision
    );
  };

  const placeTask = async (
    entry: CalendarEntry,
    day: Date,
    at: number,
    duration = entry.est ?? 30
  ) => {
    try {
      await persistTaskPlacement(entry, day, at, duration);
      await refresh();
    } catch {
      notify.error("That time is not available");
    }
  };

  const shedTasks = async (entries: readonly CalendarEntry[], day: Date) => {
    if (!data?.canEdit) return;
    const unique = new Map(
      entries.map((entry) => [entry.sourceId ?? entry.id, entry])
    );
    try {
      await Promise.all(
        [...unique.values()].map((entry) =>
          persistTaskPlacement(
            entry,
            day,
            entry.at ?? data.options.workStart ?? 9
          )
        )
      );
      await refresh();
    } catch {
      notify.error("Some tasks could not be moved");
    }
  };

  const plan = async () => {
    if (!data?.canEdit) return;
    try {
      await scheduleAllTasks();
      await refresh();
      notify.success("Calendar refreshed");
    } catch {
      notify.error("Could not refresh the plan");
    }
  };

  const openNewTask = () => {
    void fetchTags();
    setTaskOpen(true);
  };

  const saveNewTask = async (task: NewTask) => {
    await createTask(task);
    setTaskOpen(false);
    await refresh();
  };

  const shellStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    minHeight: 0,
    position: "relative",
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
              <p>Calendar could not be loaded.</p>
              <button
                type="button"
                className="mt-3 min-h-11 rounded-[var(--radius-lg)] px-4 text-[var(--accent)] shadow-[var(--shadow-ring)]"
                onClick={() => void refresh().catch(() => setError(true))}
              >
                Try again
              </button>
            </div>
          ) : (
            <span role="status">Loading calendar…</span>
          )}
        </div>
      </div>
    );
  }

  const now = newDate(data.now);
  const label = format(
    storedDate,
    view === "month" ? "MMMM yyyy" : "EEE, d MMM yyyy"
  );
  const defaultStart = dateAt(storedDate, data.options.workStart ?? 9);
  const mobileAllDay = entriesOnDay(data.entries, storedDate, now).filter(
    (entry) => entry.allDay
  );
  // A first run has no feeds and nothing scheduled: say so once, over the grid,
  // instead of handing the user an empty week and no way forward.
  const isCalendarEmpty =
    data.entries.length === 0 && Object.keys(data.calendars).length === 0;

  return (
    <div className="needt-v2" data-theme={theme} style={shellStyle}>
      <header className="flex flex-none flex-wrap items-center gap-2 px-4 pb-2 pt-4 sm:px-5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="btn-icon nt-icon-button"
            aria-label="Previous period"
            onClick={() =>
              setStoredDate(moveAnchor(storedDate, stepUnit(view), -1))
            }
          >
            <Glyph of={LuChevronLeft} size={16} />
          </button>
          <button
            type="button"
            className="min-h-9 rounded-[var(--radius-md)] px-2 text-sm font-medium shadow-[var(--shadow-ring)]"
            onClick={() => setStoredDate(now)}
          >
            {label}
          </button>
          <button
            type="button"
            className="btn-icon nt-icon-button"
            aria-label="Next period"
            onClick={() =>
              setStoredDate(moveAnchor(storedDate, stepUnit(view), 1))
            }
          >
            <Glyph of={LuChevronRight} size={16} />
          </button>
        </div>
        <div
          className="hidden items-center gap-1 sm:flex"
          aria-label="Calendar view"
        >
          {VIEWS.map((name) => (
            <button
              key={name}
              type="button"
              className={
                view === name ? "chip nt-chip is-accent" : "chip nt-chip"
              }
              aria-pressed={view === name}
              onClick={() => selectView(name)}
            >
              {name}
            </button>
          ))}
        </div>
        {data.canEdit ? (
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              className="btn-icon nt-icon-button"
              aria-label="Refresh task plan"
              onClick={() => void plan()}
            >
              <Glyph of={LuRefreshCw} size={16} />
            </button>
            <button
              type="button"
              className="btn-icon nt-icon-button"
              aria-label="New event"
              onClick={() => {
                setEventEntry(null);
                setEventOpen(true);
              }}
            >
              <Glyph of={LuPlus} size={16} />
            </button>
          </div>
        ) : null}
      </header>

      <div
        className="hidden min-h-0 flex-1 px-5 pb-5 sm:flex"
        data-calendar-view={view}
      >
        <CalendarScreen
          view={view}
          entries={data.entries}
          projects={data.projects}
          today={now}
          selectedDate={storedDate}
          monthAnchor={storedDate}
          opts={data.options}
          dark={dark}
          onOpen={openEntry}
          onToggle={
            data.canEdit ? (entry) => void toggleTask(entry) : undefined
          }
          onSelectDay={(date) => {
            setStoredDate(date);
            selectView("day");
          }}
          onPickShelf={
            data.canEdit
              ? (entry, gapStart, day) =>
                  void placeTask(entry, day, gapStart, 2)
              : undefined
          }
          onShed={
            data.canEdit
              ? (entries, day) => void shedTasks(entries, day)
              : undefined
          }
        />
      </div>

      <div
        className="scroll-inner min-h-0 flex-1 overflow-auto sm:hidden"
        data-calendar-view="day"
      >
        {mobileAllDay.length ? (
          <div
            className="mx-4 mb-2 flex flex-col gap-1"
            aria-label="All-day events"
          >
            {mobileAllDay.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => openEntry(entry)}
                className="truncate rounded-[var(--radius-sm)] px-2 py-1 text-left text-xs shadow-[var(--shadow-ring)]"
                style={{
                  background: `color-mix(in oklab, ${entry.hue ?? "var(--accent)"} 14%, var(--surface-raised))`,
                }}
              >
                {entry.title}
              </button>
            ))}
          </div>
        ) : null}
        <MobileCalendarDay
          tasks={data.entries}
          projects={data.projects}
          flexibleHours={data.options.flexibleHours}
          workWindows={data.options.workWindows}
          day={storedDate}
          today={now}
          onOpen={openEntry}
          onToggle={
            data.canEdit ? (entry) => void toggleTask(entry) : undefined
          }
        />
      </div>

      {isCalendarEmpty ? (
        <div
          className="pointer-events-none absolute inset-x-4 top-20 z-10 flex justify-center sm:top-24"
          data-testid="calendar-empty-state"
        >
          <div className="pointer-events-auto w-full max-w-sm rounded-[var(--radius-lg)] bg-[var(--surface-raised)] p-5 text-center shadow-[var(--shadow-ring)]">
            <div className="flex justify-center text-[var(--text-muted)]">
              <Glyph of={LuCalendarPlus} size={24} />
            </div>
            <h2 className="mt-3 text-sm font-semibold">
              Start with your first plan
            </h2>
            <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
              Connect a calendar or create a task and let Needt schedule it.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                className="min-h-11 rounded-[var(--radius-md)] px-3 text-[13px] font-medium text-[var(--accent)] shadow-[var(--shadow-ring)]"
                onClick={openNewTask}
              >
                Create task
              </button>
              <Link
                href="/settings#calendars"
                className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] px-3 text-[13px] font-medium shadow-[var(--shadow-ring)]"
              >
                Connect calendar
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {taskOpen ? (
        <TaskModal
          isOpen
          tags={tags}
          onClose={() => setTaskOpen(false)}
          onSave={saveNewTask}
          onCreateTag={async (name, color) => {
            const tag = await createTag({ name, color });
            await fetchTags();
            return tag;
          }}
        />
      ) : null}

      <CalendarEventDialog
        open={eventOpen}
        entry={eventEntry}
        calendars={data.calendars}
        defaultStart={defaultStart}
        canEdit={data.canEdit}
        onClose={() => setEventOpen(false)}
        onSaved={refresh}
      />
    </div>
  );
}
