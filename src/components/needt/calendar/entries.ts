/* THE CALENDAR'S OWN VIEW OF A TASK — which day it falls on, and whether it
 * has a place in the grid at all.
 *
 * `rbShape` (in `../rb-shape.ts`) is the one adapter from a stored task to
 * what a block draws; this file is upstream of that — it decides which
 * tasks a given day or grid gets handed in the first place. It resolves
 * dates through `@/lib/needt/derive.ts`'s `parseDueDate`, the same resolver
 * every other surface uses, so the calendar cannot disagree with Home or
 * Workspace about which day a task is due.
 */
import {
  calendarDayDifference,
  newDateFromYMD,
  toLocalDateKey,
} from "@/lib/date-utils";
import type { BlockingOverride } from "@/lib/flexible-hours-guard";
import { parseDueDate } from "@/lib/needt/derive";
import type {
  NeedtCalendarEntry,
  NeedtTask,
  NeedtWorkWindow,
} from "@/lib/needt/types";

import type { RbExtras } from "../rb-shape";

/**
 * What the calendar hands to `rbShape`: a stored task, plus whatever a grid
 * surface adds (`RbExtras`, all optional). `at` is the task's own start hour
 * when it has one — the same field `NeedtTask` already carries.
 */
export type CalendarEntry = NeedtTask &
  Partial<Omit<NeedtCalendarEntry, keyof NeedtTask>> &
  Partial<RbExtras>;

/** Prefer the actual scheduled day. A due date is only a fallback for work
 * that has not been placed by the scheduler. */
export function entryDate(entry: CalendarEntry, today: Date): Date | null {
  if (entry.scheduledOn) {
    const [year, month, day] = entry.scheduledOn.split("-").map(Number);
    return newDateFromYMD(year, month - 1, day);
  }
  if (entry.dueOn) {
    const [year, month, day] = entry.dueOn.split("-").map(Number);
    return newDateFromYMD(year, month - 1, day);
  }
  return parseDueDate(entry.due, today);
}

/** True when a task can be placed on the hour grid: it has a start hour and
 *  it is not the class of task that belongs to no day at all. */
export function isPlaceable(entry: CalendarEntry): boolean {
  return typeof entry.at === "number" && entry.noSlot !== true;
}

/** The task's own due date, resolved the one way every screen resolves it.
 *  `null` when the task has no due date to place on a day cell with. */
export function entryDueDate(entry: CalendarEntry, today: Date): Date | null {
  return entryDate(entry, today);
}

/** Every entry whose due date is this calendar day. */
export function entriesOnDay(
  entries: readonly CalendarEntry[],
  day: Date,
  today: Date
): CalendarEntry[] {
  return entries.filter((entry) => {
    const date = entryDate(entry, today);
    return date != null && calendarDayDifference(date, day) === 0;
  });
}

/** Minutes an entry costs the day, for a load or capacity sum. */
export function entryMinutes(entry: CalendarEntry): number {
  return entry.est ?? 0;
}

/** An entry's end hour, from its start and its estimate. Falls back to a
 *  half hour so a task with no estimate still occupies a real slot rather
 *  than collapsing to zero height. */
export function entryEndHour(entry: CalendarEntry): number {
  const start = entry.at ?? 0;
  const minutes = entry.est ?? 30;
  return start + minutes / 60;
}

export function blockedRangesForDay(
  overrides: readonly BlockingOverride[],
  day: Date,
  workStart: number,
  workEnd: number
): Array<readonly [number, number]> {
  const dateKey = toLocalDateKey(day);
  const parse = (value: string | null) => {
    if (!value) return null;
    const [hour, minute] = value.split(":").map(Number);
    return hour + minute / 60;
  };
  return overrides
    .filter((override) => override.date === dateKey)
    .flatMap((override): Array<readonly [number, number]> => {
      if (override.kind === "BLOCK_WHOLE_DAY") return [[0, 24]];
      const start = parse(override.startTime);
      const end = parse(override.endTime);
      if (override.kind === "BLOCK_HOURS" && start != null && end != null) {
        return [[start, end]];
      }
      if (override.kind === "START_LATER" && start != null) {
        return [[workStart, start]];
      }
      if (override.kind === "STOP_EARLY" && end != null) {
        return [[end, workEnd]];
      }
      return [];
    });
}

export function workingRangesForDay(
  windows: readonly NeedtWorkWindow[],
  day: Date
): Array<readonly [number, number]> {
  return windows
    .filter((window) => window.dayOfWeek === day.getDay())
    .map((window) => {
      const [startHour, startMinute] = window.startTime.split(":").map(Number);
      const [endHour, endMinute] = window.endTime.split(":").map(Number);
      return [
        startHour + startMinute / 60,
        endHour + endMinute / 60,
      ] as const;
    });
}
