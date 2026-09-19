"use client";

/* THE CALENDAR SCREEN — the switch across Day, Week, Month, Columns and
 * Sequence. Exported for a caller to mount; this module never mounts
 * itself.
 */
import * as React from "react";

import { addCalendarDays, calendarDayDifference } from "@/lib/date-utils";
import { parseDueDate } from "@/lib/needt/derive";

import { ColumnsScreen } from "./ColumnsScreen";
import { MonthView } from "./MonthView";
import { SequenceView } from "./SequenceView";
import { WeekGrid } from "./WeekGrid";
import type { CalendarEntry } from "./entries";
import { WEEK_VISIBLE_DAYS, daysRange } from "./geometry";

export type CalendarView = "day" | "week" | "month" | "columns" | "sequence";

export interface CalendarOpts {
  use24Hour?: boolean;
  weekStart?: "mon" | "sun";
  workStart?: number;
  workEnd?: number;
}

export interface CalendarScreenProps {
  view: CalendarView;
  entries: readonly CalendarEntry[];
  today: Date;
  /** The day Day/Week centre on. Defaults to `today`. */
  selectedDate?: Date;
  /** The month Month centres on. Defaults to `today`. */
  monthAnchor?: Date;
  opts?: CalendarOpts;
  dark?: boolean;
  onOpen?: (entry: CalendarEntry) => void;
  onToggle?: (entry: CalendarEntry) => void;
  onSelectDay?: (date: Date) => void;
  onPickShelf?: (entry: CalendarEntry, gapStart: number) => void;
  onShed?: (entries: readonly CalendarEntry[], toDate: Date) => void;
}

const DEFAULT_OPTS: Required<CalendarOpts> = {
  use24Hour: true,
  weekStart: "mon",
  workStart: 9,
  workEnd: 18,
};

/** The two-minute shelf's candidates: every entry with an entry step, ranked
 *  by nearest due date — the whole pool, not only what a day column shows. */
function shelfCandidatesOf(
  entries: readonly CalendarEntry[],
  today: Date
) {
  return entries.map((entry) => {
    const due = parseDueDate(entry.due, today);
    return {
      id: entry.id,
      entry: entry.entry,
      done: entry.done,
      dueInDays: due ? calendarDayDifference(due, today) : null,
      entryRef: entry,
    };
  });
}

export function CalendarScreen({
  view,
  entries,
  today,
  selectedDate = today,
  monthAnchor = today,
  opts,
  dark = false,
  onOpen,
  onToggle,
  onSelectDay,
  onPickShelf,
  onShed,
}: CalendarScreenProps) {
  const o = { ...DEFAULT_OPTS, ...opts };
  const shelfCandidates = React.useMemo(
    () => shelfCandidatesOf(entries, today),
    [entries, today]
  );

  if (view === "columns") {
    return (
      <ColumnsScreen
        entries={entries}
        today={today}
        workEnd={o.workEnd}
        dark={dark}
        onOpen={onOpen}
        onToggle={onToggle}
        onShed={onShed}
      />
    );
  }

  if (view === "sequence") {
    return (
      <SequenceView
        entries={entries}
        today={today}
        use24Hour={o.use24Hour}
        dark={dark}
        onOpen={onOpen}
        onToggle={onToggle}
      />
    );
  }

  if (view === "month") {
    return (
      <MonthView
        monthAnchor={monthAnchor}
        today={today}
        entries={entries}
        weekStart={o.weekStart}
        onOpen={onOpen}
        onSelectDay={onSelectDay}
      />
    );
  }

  /* Day and Week share one grid (see `WeekGrid`'s own doc comment): both are
     a continuous scrollable run of days, differing only in how many are
     visible at once — one for Day, five for Week — and where the run's own
     headroom sits relative to the selected day. */
  const visibleDays = view === "day" ? 1 : WEEK_VISIBLE_DAYS;
  const spanBefore = view === "day" ? 3 : 7;
  const spanAfter = view === "day" ? 3 : 14;
  const rangeStart = addCalendarDays(selectedDate, -spanBefore);
  const days = daysRange(rangeStart, spanBefore + spanAfter + 1);

  return (
    <WeekGrid
      days={days}
      entries={entries}
      today={today}
      anchorIndex={spanBefore}
      workStart={o.workStart}
      workEnd={o.workEnd}
      visibleDays={visibleDays}
      use24Hour={o.use24Hour}
      dark={dark}
      shelfCandidates={shelfCandidates}
      onOpen={onOpen}
      onToggle={onToggle}
      onPickShelf={onPickShelf}
    />
  );
}
