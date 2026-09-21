"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import {
  LuChevronLeft,
  LuChevronRight,
  LuPlus,
  LuRefreshCw,
} from "react-icons/lu";

import { useTheme } from "@/components/providers/ThemeProvider";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";

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

import { useViewStore } from "@/store/calendar";
import { useTaskStore } from "@/store/task";

import type { ResolvedThemeMode } from "@/types/settings";
import { TaskStatus } from "@/types/task";

import { MobileCalendarDay } from "../mobile";
import { Glyph } from "../shell/chrome";
import { CalendarEventDialog } from "./CalendarEventDialog";
import { CalendarScreen, type CalendarOpts, type CalendarView } from "./CalendarScreen";
import { entriesOnDay, type CalendarEntry } from "./entries";

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
  const [view, setView] = React.useState<CalendarView>(() =>
    storedView === "day" || storedView === "week" || storedView === "month"
      ? storedView
      : "week"
  );
  const [data, setData] = React.useState<CalendarPayload | null>(null);
  const [error, setError] = React.useState(false);
  const [eventEntry, setEventEntry] = React.useState<CalendarEntry | null>(null);
  const [eventOpen, setEventOpen] = React.useState(false);
  const pendingTaskIds = React.useRef(new Set<string>());

  React.useEffect(() => {
    if (storedView === "day" || storedView === "week" || storedView === "month") {
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
    router.push(`/tasks?task=${encodeURIComponent(entry.sourceId ?? entry.id)}`);
  };

  const toggleTask = async (entry: CalendarEntry) => {
    if (!data?.canEdit || entry.kind === "event" || entry.kind === "busy") return;
    const taskId = entry.sourceId ?? entry.id;
    if (pendingTaskIds.current.has(taskId)) return;
    pendingTaskIds.current.add(taskId);
    try {
      await updateTaskRequest(taskId, {
        status: entry.done ? TaskStatus.TODO : TaskStatus.COMPLETED,
      });
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
    if (!data?.canEdit || entry.kind === "event" || entry.kind === "busy") return;
    const start = dateAt(day, at);
    const end = newDate(start.getTime() + duration * 60_000);
    await updateTaskRequest(entry.sourceId ?? entry.id, {
      scheduledStart: start,
      scheduledEnd: end,
      scheduleLocked: true,
    });
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
    const unique = new Map(entries.map((entry) => [entry.sourceId ?? entry.id, entry]));
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

  return (
    <div className="needt-v2" data-theme={theme} style={shellStyle}>
      <header className="flex flex-none flex-wrap items-center gap-2 px-4 pb-2 pt-4 sm:px-5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="btn-icon nt-icon-button"
            aria-label="Previous period"
            onClick={() => setStoredDate(moveAnchor(storedDate, view, -1))}
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
            onClick={() => setStoredDate(moveAnchor(storedDate, view, 1))}
          >
            <Glyph of={LuChevronRight} size={16} />
          </button>
        </div>
        <div className="hidden items-center gap-1 sm:flex" aria-label="Calendar view">
          {VIEWS.map((name) => (
            <button
              key={name}
              type="button"
              className={view === name ? "chip nt-chip is-accent" : "chip nt-chip"}
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
          onToggle={data.canEdit ? (entry) => void toggleTask(entry) : undefined}
          onSelectDay={(date) => {
            setStoredDate(date);
            selectView("day");
          }}
          onPickShelf={
            data.canEdit
              ? (entry, gapStart, day) => void placeTask(entry, day, gapStart, 2)
              : undefined
          }
          onShed={data.canEdit ? (entries, day) => void shedTasks(entries, day) : undefined}
        />
      </div>

      <div
        className="scroll-inner min-h-0 flex-1 overflow-auto sm:hidden"
        data-calendar-view="day"
      >
        {mobileAllDay.length ? (
          <div className="mx-4 mb-2 flex flex-col gap-1" aria-label="All-day events">
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
          onToggle={data.canEdit ? (entry) => void toggleTask(entry) : undefined}
        />
      </div>

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
