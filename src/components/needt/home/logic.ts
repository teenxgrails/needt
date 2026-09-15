/* HOME'S OWN PURE LOGIC — no DOM, no React, provably right on its own.
 *
 * Three things Home draws that are worth getting right independent of any
 * render: how full a habit's record is, which third of the day a task falls
 * in, and where a wall sits when it is parked versus pulled over the day.
 * Each is a pure function over plain data so it can be tested without
 * mounting anything — see `__tests__/logic.test.ts`.
 *
 * This file owns nothing from `@/lib/needt` — it only reads the shapes it
 * needs, so it stays a home-local concern per the port's scope discipline.
 */
import { newDate } from "@/lib/date-utils";
import type { NeedtDayMark, NeedtHabit } from "@/lib/needt/types";

/* ── The habit record — kept days out of the window, never a streak ─────── */

/** The window every habit measure reads: "kept days out of the last 14". */
export const HABIT_WINDOW_DAYS = 14;

/** How many of a habit's last N days were kept, and how many the record holds. */
export interface HabitRatio {
  kept: number;
  /** How many days the record actually covers — `<= window`, never padded. */
  of: number;
}

/**
 * `done` is oldest-first, so the last `window` entries are the most recent
 * days. A record shorter than the window is read honestly rather than padded
 * with assumed misses — a habit started six days ago is "kept N of 6", not
 * "kept N of 14".
 */
export function habitKeptRatio(
  done: readonly NeedtDayMark[],
  window: number = HABIT_WINDOW_DAYS
): HabitRatio {
  const slice = done.slice(-window);
  const kept = slice.reduce((sum: number, day) => sum + day, 0);
  return { kept, of: slice.length };
}

/** A quota habit is judged by its week, so a miss inside a week that still
 * meets the quota is not a miss at all — the last 7 days, kept count only. */
export function habitWeekKept(done: readonly NeedtDayMark[]): number {
  return done.slice(-7).reduce((sum: number, day) => sum + day, 0);
}

/** One day of the field: how many of the habits in view were kept that day. */
export interface HabitFieldDay {
  /** 0 is the oldest day drawn, `window - 1` is today. */
  index: number;
  kept: number;
  of: number;
  today: boolean;
}

/**
 * The squares are the record: one cell per day, shaded by what fraction of
 * the standing habits were kept that day — aggregated across every habit
 * rather than fabricated history, so the field never shows a day nobody has
 * data for. A habit whose own record does not reach back `window` days simply
 * does not vote on the days before it started.
 */
export function habitFieldDays(
  habits: readonly NeedtHabit[],
  window: number = HABIT_WINDOW_DAYS
): HabitFieldDay[] {
  const days: HabitFieldDay[] = [];
  const slices = habits.map((h) => h.done.slice(-window));
  for (let i = 0; i < window; i++) {
    let kept = 0;
    let of = 0;
    for (const slice of slices) {
      /* A day slot only exists once the habit's own record reaches it —
         `slice` is right-aligned on today, so a shorter record leaves its
         earliest slots empty rather than backfilling a guess. */
      const offset = window - slice.length;
      if (i < offset) continue;
      of++;
      if (slice[i - offset]) kept++;
    }
    days.push({ index: i, kept, of, today: i === window - 1 });
  }
  return days;
}

/* ── The day, cut into its parts ─────────────────────────────────────────── */

/** The three parts of a day, plus the bucket for anything with no hour. */
export type HomePart = "Morning" | "Afternoon" | "Evening" | "Any time";

/** Fixed order: the day runs forward, then the undated tasks trail it. */
export const HOME_PART_ORDER: readonly HomePart[] = Object.freeze([
  "Morning",
  "Afternoon",
  "Evening",
  "Any time",
]);

/** Ported from the prototype's `cvParted`: `< 12` morning, `< 17` afternoon,
 * otherwise evening. No hour at all is its own bucket, not a guess. */
export function homePartOf(at: number | null | undefined): HomePart {
  if (at == null) return "Any time";
  if (at < 12) return "Morning";
  if (at < 17) return "Afternoon";
  return "Evening";
}

export interface HomePartHeaderRow {
  kind: "header";
  part: HomePart;
  /** True for the first row of the whole list — it carries no top gap. */
  first: boolean;
}

export interface HomePartItemRow<T> {
  kind: "item";
  task: T;
}

export type HomePartedRow<T> = HomePartHeaderRow | HomePartItemRow<T>;

/**
 * Cut a day's tasks into Morning / Afternoon / Evening / Any time, each part
 * introduced once by a header row immediately before its first task. Order
 * within a part is stable — `Array#sort` only moves a task across a part
 * boundary, never past another task already in the same part.
 */
export function homeParted<T extends { at?: number | null }>(
  tasks: readonly T[]
): HomePartedRow<T>[] {
  const partOf = (task: T) => homePartOf(task.at);
  const sorted = [...tasks].sort(
    (a, b) => HOME_PART_ORDER.indexOf(partOf(a)) - HOME_PART_ORDER.indexOf(partOf(b))
  );
  const out: HomePartedRow<T>[] = [];
  let seen: HomePart | null = null;
  for (const task of sorted) {
    const part = partOf(task);
    if (part !== seen) {
      out.push({ kind: "header", part, first: out.length === 0 });
      seen = part;
    }
    out.push({ kind: "item", task });
  }
  return out;
}

/* ── The week plate's one number that is not in the fixture ─────────────── */

/**
 * The ISO-8601 week number, ported from the standard nearest-Thursday
 * algorithm. Every intermediate date goes through `newDate()` rather than a
 * bare `new Date()`, per repository convention.
 */
export function isoWeekNumber(date: Date): number {
  const cursor = newDate(date);
  const isoDay = (cursor.getDay() + 6) % 7; // Monday = 0 … Sunday = 6
  cursor.setDate(cursor.getDate() - isoDay + 3); // nearest Thursday
  const firstThursday = newDate(cursor);
  firstThursday.setMonth(0, 1);
  if (firstThursday.getDay() !== 4) {
    firstThursday.setMonth(0, 1 + ((4 - firstThursday.getDay() + 7) % 7));
  }
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  return 1 + Math.round((cursor.getTime() - firstThursday.getTime()) / weekMs);
}

/* ── The walls — parked versus extended, as numbers ──────────────────────── */

/** The shelf's own width and its lip, in the units the geometry is computed in. */
export const WALL_WIDTH = 264;
export const WALL_LIP = 22;
/** "You can see something is stacked out there but cannot read it." */
export const WALL_PARKED_OPACITY = 0.26;

export type WallSide = "left" | "right";

export interface WallGeometry {
  /** 0 when extended; otherwise the shelf sits `width - lip` off its edge,
   * leaving only the lip in view — negative on the left, positive on the
   * right, so `translateX(px)` always points the shelf back toward its wall. */
  translateX: number;
  opacity: number;
  parked: boolean;
}

/**
 * Where a wall sits. Pure arithmetic so the "parked leaves exactly the lip
 * visible, extended sits flush" claim is checked without a layout engine —
 * the actual containment (`overflow: clip` on the room, `pointer-events`
 * split between the lip and the extended body) is the component's job, not
 * this function's; see `Wall.tsx`.
 */
export function wallGeometry(
  side: WallSide,
  extended: boolean,
  width: number = WALL_WIDTH,
  lip: number = WALL_LIP
): WallGeometry {
  const hidden = Math.max(width - lip, 0);
  const parkedX = side === "left" ? -hidden : hidden;
  return {
    translateX: extended ? 0 : parkedX,
    opacity: extended ? 1 : WALL_PARKED_OPACITY,
    parked: !extended,
  };
}
