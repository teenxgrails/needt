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
import { calendarDayDifference } from "@/lib/date-utils";
import { parseDueDate } from "@/lib/needt/derive";
import type { NeedtTask } from "@/lib/needt/types";

import type { RbExtras } from "../rb-shape";

/**
 * What the calendar hands to `rbShape`: a stored task, plus whatever a grid
 * surface adds (`RbExtras`, all optional). `at` is the task's own start hour
 * when it has one — the same field `NeedtTask` already carries.
 */
export type CalendarEntry = NeedtTask & Partial<RbExtras>;

/** True when a task can be placed on the hour grid: it has a start hour and
 *  it is not the class of task that belongs to no day at all. */
export function isPlaceable(entry: CalendarEntry): boolean {
  return typeof entry.at === "number" && entry.noSlot !== true;
}

/** The task's own due date, resolved the one way every screen resolves it.
 *  `null` when the task has no due date to place on a day cell with. */
export function entryDueDate(entry: CalendarEntry, today: Date): Date | null {
  return parseDueDate(entry.due, today);
}

/** Every entry whose due date is this calendar day. */
export function entriesOnDay(
  entries: readonly CalendarEntry[],
  day: Date,
  today: Date
): CalendarEntry[] {
  return entries.filter((entry) => {
    const due = entryDueDate(entry, today);
    return due != null && calendarDayDifference(due, day) === 0;
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
