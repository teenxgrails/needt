/* THE GRID'S GEOMETRY — no DOM in it.
 *
 * Height is duration, without exception: every pixel figure a screen draws —
 * a block's top and height, the now-line, the hatched non-working hours, the
 * initial scroll position — comes from one of these functions rather than
 * being computed inline, so the grid cannot drift from its own scale.
 *
 * `HOUR_HEIGHT_PX` mirrors `--hour-h` in the vendored token sheet (46px). It
 * is restated here as a number because this module does grid arithmetic in
 * JS, not CSS `calc()` — the two must agree, and `--hour-h` is never edited
 * by hand (`src/styles/needt-*.css` is vendored), so this constant only ever
 * needs to change if the token sheet itself changes it.
 *
 * Dates: every function that touches a real calendar date takes one in and
 * uses only `@/lib/date-utils` helpers plus the native `Date` accessor
 * methods already used throughout `src/lib/needt/derive.ts` (`getDate()`,
 * `getMonth()`, `getDay()` are not `date-fns` — they are the platform). A
 * fractional hour (`9.5` for 09:30) is grid geometry, not a calendar date, so
 * `formatClock` below does no date arithmetic at all.
 */
import {
  addCalendarDays,
  calendarDayDifference,
  getDaysInMonth,
  newDateFromYMD,
} from "@/lib/date-utils";

/* ── The scale ─────────────────────────────────────────────────────────── */

/** 46px an hour. Must match `--hour-h` in `src/styles/needt-*.css`. */
export const HOUR_HEIGHT_PX = 46;

/** A block's floor: a fifteen-minute block is still one readable line. */
export const BLOCK_MIN_HEIGHT_PX = 32;

/** All 24 hours are shown; nothing is hidden. */
export const GRID_START_HOUR = 0;
export const GRID_END_HOUR = 24;

/** The grid opens scrolled to the working hours, not clipped to them. */
export const DEFAULT_WORK_START_HOUR = 9;
export const DEFAULT_WORK_END_HOUR = 18;

/** A quarter hour — the drag/aim snap and the two-minute shelf's own unit. */
export const SNAP_HOUR = 0.25;

/** Five days in view; the rest is horizontal scroll, wheel and drag. */
export const WEEK_VISIBLE_DAYS = 5;

/** The hour gutter's width, dotted rail included. */
export const GUTTER_WIDTH_PX = 68;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Where an hour sits, top-down, from the grid's own start. */
export function topForHour(
  hour: number,
  gridStart: number = GRID_START_HOUR,
  hourHeight: number = HOUR_HEIGHT_PX
): number {
  return (hour - gridStart) * hourHeight;
}

/** Duration → height, floored at one readable line. */
export function heightForDuration(
  minutes: number,
  hourHeight: number = HOUR_HEIGHT_PX
): number {
  return Math.max((minutes / 60) * hourHeight - 4, BLOCK_MIN_HEIGHT_PX);
}

/** Snap a fractional hour to the nearest quarter, clamped to the grid. */
export function snapToGrid(
  hour: number,
  snap: number = SNAP_HOUR,
  min: number = GRID_START_HOUR,
  max: number = GRID_END_HOUR
): number {
  return clamp(Math.round(hour / snap) * snap, min, max);
}

/** Non-working stretches, hatched rather than hidden. Drops an empty range —
 *  a work day that starts at the grid's own start has nothing to hatch. */
export function nonWorkingRanges(
  workStart: number = DEFAULT_WORK_START_HOUR,
  workEnd: number = DEFAULT_WORK_END_HOUR,
  gridStart: number = GRID_START_HOUR,
  gridEnd: number = GRID_END_HOUR
): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  if (workStart > gridStart) ranges.push([gridStart, workStart]);
  if (gridEnd > workEnd) ranges.push([workEnd, gridEnd]);
  return ranges;
}

/** Where the grid opens: scrolled to the working hours, half a line of
 *  headroom above the first one so its label is not cut by the sticky head. */
export function initialScrollTop(
  workStart: number = DEFAULT_WORK_START_HOUR,
  hourHeight: number = HOUR_HEIGHT_PX,
  gridStart: number = GRID_START_HOUR,
  headroom = 8
): number {
  return (workStart - gridStart) * hourHeight - headroom;
}

/** The column a day sits in while scrolled: `anchorIndex * columnWidth`. */
export function initialScrollLeft(
  anchorIndex: number,
  columnWidth: number
): number {
  return anchorIndex * columnWidth;
}

/** A day column's width, given the scroller's own client width. */
export function columnWidth(
  clientWidth: number,
  visibleDays: number = WEEK_VISIBLE_DAYS,
  gutterWidth: number = GUTTER_WIDTH_PX
): number {
  return Math.max(0, (clientWidth - gutterWidth) / visibleDays);
}

/* ── Clock text ────────────────────────────────────────────────────────── */

/**
 * A fractional hour (`13.5`) as clock text. This is grid geometry, not a
 * calendar date — the value has no day, month or timezone attached to it —
 * so it is formatted directly rather than routed through a constructed
 * `Date`, which would need one of those to mean anything.
 */
export function formatClock(hour: number, use24 = true): string {
  const wrapped = ((hour % 24) + 24) % 24;
  const h = Math.floor(wrapped);
  const m = Math.round((wrapped - h) * 60);
  if (use24) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  const twelve = h % 12 === 0 ? 12 : h % 12;
  const minutePart = m ? `:${String(m).padStart(2, "0")}` : "";
  return `${twelve}${minutePart} ${h < 12 ? "am" : "pm"}`;
}

/** The current time as a fractional hour, from a real `Date`. */
export function hourOfDay(date: Date): number {
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}

/* ── The week strip ───────────────────────────────────────────────────── */

/** `count` consecutive calendar days starting `offset` days from `anchor`. */
export function daysRange(
  anchor: Date,
  count: number,
  offset = 0
): Date[] {
  const out: Date[] = [];
  for (let i = 0; i < count; i++) {
    out.push(addCalendarDays(anchor, offset + i));
  }
  return out;
}

/* ── The month grid ───────────────────────────────────────────────────── */

export interface MonthCell {
  date: Date;
  /** False for the lead-in/trail-out days that fill the 6×7 grid. */
  inMonth: boolean;
  isToday: boolean;
}

/**
 * The month as 6×7 cells, Monday-first by default.
 *
 * The lead-in is derived from the month's own first day — never a literal —
 * by reading `Date#getDay()` (native, not `date-fns`) off a `Date` this
 * module built with `newDateFromYMD`. `CalendarScreen.jsx`'s month searched
 * a hand-authored week array for "1 Sep" to find the same number; that only
 * works because the fixture happens to encode it, and it produced the
 * regression PORT.md §3 warns against. Real date math cannot disagree with
 * itself.
 */
export function monthGridCells(
  monthAnchor: Date,
  today: Date,
  weekStart: "mon" | "sun" = "mon"
): MonthCell[] {
  const year = monthAnchor.getFullYear();
  const month = monthAnchor.getMonth();
  const first = newDateFromYMD(year, month, 1);
  const weekday = first.getDay(); // 0 = Sun .. 6 = Sat
  const lead = weekStart === "sun" ? weekday : (weekday + 6) % 7;
  const cells: MonthCell[] = [];
  for (let i = 0; i < 42; i++) {
    const date = addCalendarDays(first, i - lead);
    cells.push({
      date,
      inMonth: date.getMonth() === month,
      isToday: calendarDayDifference(date, today) === 0,
    });
  }
  return cells;
}

/** How many real days a month has — used only to sanity-check a grid in
 *  tests; the render itself never needs the count, only the 42 cells. */
export function daysInMonth(monthAnchor: Date): number {
  return getDaysInMonth(monthAnchor).length;
}
