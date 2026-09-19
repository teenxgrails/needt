"use client";

/* CALENDAR — one day, because seven columns on a phone are seven slivers.
 *
 * Ported from `Mobile.jsx`'s `MbCalendar`. The desktop's week grid opens all
 * 24 hours, hatched outside working hours (PORT.md §3); the prototype's own
 * phone calendar narrows that to a fixed 08:00–21:00 window with no hatch —
 * a phone has no width to spare for a scrollbar-free horizontal week, so
 * Day is the only view, and the prototype trims the vertical range to what a
 * waking day actually uses rather than asking a thumb to scroll through the
 * small hours. That is a deliberate difference from the desktop spec, kept
 * here rather than "fixed" back to 24 hours, because it is the prototype's
 * own decision for this shell, not an omission.
 *
 * Everything that actually draws a block is unchanged from the desktop:
 * `DayColumn` (`../calendar`) owns the collapse order and the overlap
 * clustering — this file only decides which hours are in view and measures
 * the column's width once, per PORT.md §8 ("observe the container, not
 * every card").
 */
import * as React from "react";

import { calendarDayDifference } from "@/lib/date-utils";

import {
  type CalendarEntry,
  DayColumn,
  HourGutter,
  entriesOnDay,
} from "../calendar";

const MOBILE_DAY_START = 8;
const MOBILE_DAY_END = 21;
const MOBILE_HOUR_HEIGHT = 52;
const MOBILE_GUTTER_WIDTH = 44;

export interface MobileCalendarDayProps {
  tasks: readonly CalendarEntry[];
  /** The day in view — a plain calendar day, independent of "today". */
  day: Date;
  today: Date;
  onOpen?: (entry: CalendarEntry) => void;
  onToggle?: (entry: CalendarEntry) => void;
}

export function MobileCalendarDay({
  tasks,
  day,
  today,
  onOpen,
  onToggle,
}: MobileCalendarDayProps) {
  const columnRef = React.useRef<HTMLDivElement | null>(null);
  const [columnWidth, setColumnWidth] = React.useState(320);

  React.useEffect(() => {
    const node = columnRef.current;
    if (!node) return undefined;
    /* One observer on the column itself, not one per block — the block
       count in a day changes far more often than the column's own width. */
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setColumnWidth(width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const entries = React.useMemo(
    () => entriesOnDay(tasks, day, today),
    [tasks, day, today]
  );
  const isToday = calendarDayDifference(day, today) === 0;

  return (
    <div
      style={{ position: "relative", display: "flex", padding: "0 16px 16px" }}
    >
      <HourGutter
        gridStart={MOBILE_DAY_START}
        gridEnd={MOBILE_DAY_END}
        hourHeight={MOBILE_HOUR_HEIGHT}
        width={MOBILE_GUTTER_WIDTH}
      />
      <div
        ref={columnRef}
        style={{ position: "relative", flex: 1, minWidth: 0 }}
      >
        <DayColumn
          entries={entries}
          isToday={isToday}
          gridStart={MOBILE_DAY_START}
          gridEnd={MOBILE_DAY_END}
          hourHeight={MOBILE_HOUR_HEIGHT}
          columnWidthPx={columnWidth}
          onOpen={onOpen}
          onToggle={onToggle}
        />
      </div>
    </div>
  );
}
