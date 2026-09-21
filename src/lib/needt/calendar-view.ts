import { RRule } from "rrule";

import {
  differenceInMinutes,
  formatInTimeZone,
  newDate,
} from "@/lib/date-utils";

import { toNeedtTask, type NeedtTaskRow } from "./task-view";
import type { NeedtCalendarEntry } from "./types";

const FALLBACK_HUE = "var(--muted-foreground)";

export interface CalendarEventViewRow {
  id: string;
  feedId: string;
  externalEventId: string | null;
  title: string;
  description: string | null;
  start: Date;
  end: Date;
  location: string | null;
  isRecurring: boolean;
  recurrenceRule: string | null;
  allDay: boolean;
  status: string | null;
  isMaster: boolean;
  masterEventId: string | null;
  recurringEventId: string | null;
  feed: { name: string; color: string | null };
}

function clockHour(date: Date, timeZone: string): number {
  return (
    Number(formatInTimeZone(date, timeZone, "H")) +
    Number(formatInTimeZone(date, timeZone, "m")) / 60
  );
}

function dayKey(date: Date, timeZone: string, allDay = false): string {
  return allDay
    ? date.toISOString().slice(0, 10)
    : formatInTimeZone(date, timeZone, "yyyy-MM-dd");
}

export function toCalendarTaskEntries(
  row: NeedtTaskRow,
  now: Date,
  timeZone: string
): NeedtCalendarEntry[] {
  const task = toNeedtTask(row, now, timeZone);
  const blocks = row.scheduledBlocks.length
    ? row.scheduledBlocks
    : row.scheduledStart && row.scheduledEnd
      ? [
          {
            id: `${row.id}:legacy`,
            start: row.scheduledStart,
            end: row.scheduledEnd,
            chunkIndex: 0,
            chunkCount: 1,
            isFrozen: Boolean(row.isFrozen || row.scheduleLocked),
          },
        ]
      : [];

  if (!blocks.length) {
    return [{ ...task, id: `task:${row.id}`, kind: "task", sourceId: row.id }];
  }

  return blocks.map((block) => ({
    ...task,
    id: `task:${row.id}:${block.id}`,
    kind: "task" as const,
    sourceId: row.id,
    scheduledBlockId: block.id,
    scheduledOn: dayKey(block.start, timeZone),
    scheduledStart: block.start.toISOString(),
    scheduledEnd: block.end.toISOString(),
    at: clockHour(block.start, timeZone),
    est: Math.max(1, differenceInMinutes(block.end, block.start)),
    noSlot: false,
    chunkIndex: block.chunkIndex,
    chunkCount: block.chunkCount,
    frozen: block.isFrozen,
    movable: !block.isFrozen,
  }));
}

function toCalendarEventEntry(
  event: CalendarEventViewRow,
  timeZone: string,
  occurrence?: { start: Date; end: Date; id: string }
): NeedtCalendarEntry {
  const start = occurrence?.start ?? event.start;
  const end = occurrence?.end ?? event.end;
  const busy = event.feedId === "workspace-busy";
  return {
    id: occurrence?.id ?? `event:${event.id}`,
    sourceId: event.id,
    kind: busy ? "busy" : "event",
    title: busy ? "Busy" : event.title,
    project: null,
    done: false,
    scheduledOn: dayKey(start, timeZone, event.allDay),
    scheduledStart: start.toISOString(),
    scheduledEnd: end.toISOString(),
    at: event.allDay ? undefined : clockHour(start, timeZone),
    est: Math.max(1, differenceInMinutes(end, start)),
    noSlot: event.allDay || undefined,
    event: true,
    movable: false,
    hue: event.feed.color ?? FALLBACK_HUE,
    feedId: event.feedId,
    calendarName: busy ? "Busy" : event.feed.name,
    description: busy ? undefined : (event.description ?? undefined),
    location: busy ? undefined : (event.location ?? undefined),
    allDay: event.allDay,
    isRecurring: event.isRecurring,
    recurrenceRule: event.recurrenceRule ?? undefined,
    isMaster: event.isMaster,
    externalEventId: busy
      ? undefined
      : (event.externalEventId ?? undefined),
    occurrenceStart: occurrence?.start.toISOString(),
    seriesStart: event.isMaster ? event.start.toISOString() : undefined,
    seriesEnd: event.isMaster ? event.end.toISOString() : undefined,
    parts: null,
    entry: null,
    value: null,
    earned: null,
    heat: null,
    waitsOn: null,
    movedFrom: null,
  };
}

function overlaps(start: Date, end: Date, rangeStart: Date, rangeEnd: Date) {
  return start <= rangeEnd && end >= rangeStart;
}

/** Expand recurring masters only when a provider has not materialized a
 * replacement instance for that occurrence. Invalid rules degrade to the
 * stored event instead of making the calendar disappear. */
export function toCalendarEventEntries(
  events: readonly CalendarEventViewRow[],
  rangeStart: Date,
  rangeEnd: Date,
  timeZone: string
): NeedtCalendarEntry[] {
  const out: NeedtCalendarEntry[] = [];
  const modified = events.filter((event) => !event.isMaster && event.masterEventId);

  for (const event of events) {
    if (!event.isMaster || !event.recurrenceRule) {
      if (overlaps(event.start, event.end, rangeStart, rangeEnd)) {
        out.push(toCalendarEventEntry(event, timeZone));
      }
      continue;
    }

    try {
      const rule = RRule.fromString(event.recurrenceRule);
      const duration = event.end.getTime() - event.start.getTime();
      for (const start of rule.between(rangeStart, rangeEnd, true)) {
        const replacement = modified.find(
          (candidate) =>
            candidate.masterEventId === event.id &&
            candidate.start.toISOString().slice(0, 10) ===
              start.toISOString().slice(0, 10)
        );
        if (replacement) continue;
        const end = newDate(start.getTime() + duration);
        out.push(
          toCalendarEventEntry(event, timeZone, {
            start,
            end,
            id: `event:${event.id}:${start.toISOString()}`,
          })
        );
      }
    } catch {
      if (overlaps(event.start, event.end, rangeStart, rangeEnd)) {
        out.push(toCalendarEventEntry(event, timeZone));
      }
    }
  }

  const expanded = out.flatMap((entry) => {
    if (!entry.allDay || !entry.scheduledStart || !entry.scheduledEnd) {
      return [entry];
    }
    const eventStart = newDate(entry.scheduledStart);
    const eventEnd = newDate(entry.scheduledEnd);
    const days: NeedtCalendarEntry[] = [];
    for (
      let cursor = eventStart;
      cursor < eventEnd;
      cursor = newDate(cursor.getTime() + 86_400_000)
    ) {
      if (cursor > rangeEnd || cursor.getTime() + 86_400_000 < rangeStart.getTime()) {
        continue;
      }
      const scheduledOn = cursor.toISOString().slice(0, 10);
      days.push({
        ...entry,
        id: `${entry.id}:${scheduledOn}`,
        scheduledOn,
      });
    }
    return days.length ? days : [entry];
  });

  return expanded.sort((left, right) =>
    (left.scheduledStart ?? "").localeCompare(right.scheduledStart ?? "")
  );
}
