/* THE DERIVED FACTS — never stored.
 *
 * The chain, the counts and the streak are computed on demand, every time,
 * from the tasks themselves. A written-down chain disagrees with its own
 * tasks by Thursday: close one task and every stored "blocked by" and every
 * stored "is holding up 4" that mentioned it is now a lie, and nothing in the
 * product is responsible for noticing. Deriving costs a pass over an array;
 * storing costs a bug report a week.
 *
 * Everything here is a pure function over arrays — never a method hanging off
 * the data — so a screen can pass its own filtered list and get an answer
 * about that list, and so a Prisma-backed source needs no behaviour of its
 * own.
 */
import {
  calendarDayDifference,
  newDate,
  newDateFromYMD,
  startOfDay,
} from "@/lib/date-utils";

import { MONTHS, projectAliases as fixtureAliases } from "./fixture";
import type {
  NeedtBlocker,
  NeedtDayMark,
  NeedtPerson,
  NeedtProject,
  NeedtProjectAliases,
  NeedtTask,
} from "./types";

/* ── The chain ─────────────────────────────────────────────────────────── */

/**
 * What a task is waiting on, resolved: another task that has to close first,
 * or a person with a reason.
 *
 * A task blocker outranks a person blocker — the task is the thing you can
 * act on. A blocker that is already `done` is ignored rather than reported,
 * because a closed task holds nothing up. Returns `null` honestly when
 * nothing is in the way; there is no "probably waiting on someone".
 */
export function blockerOf(
  task: NeedtTask,
  tasks: readonly NeedtTask[]
): NeedtBlocker | null {
  if (task.blockedBy !== undefined) {
    const by = tasks.find((candidate) => candidate.id === task.blockedBy);
    if (by && !by.done) return { kind: "task", task: by };
  }
  if (task.waitsOn) {
    return { kind: "person", on: task.waitsOn.on, for: task.waitsOn.for };
  }
  return null;
}

/* The memo. `unblocks` is the ranking the day view asks for once per task per
   render, and each call walks the whole list; without a cache an ordinary
   board is quadratic on every paint.

   The cache is keyed by list identity first, then by task id, and the outer
   map is weak — so the normal React path (a new array each update) recomputes
   and the old entry is collected. Mutating a list in place is the one case
   the cache cannot see: call `clearUnblocksCache()` after doing that. */
let unblocksCache = new WeakMap<object, Map<string, number>>();

/**
 * How many open tasks this task is holding up, counted transitively through
 * the `blockedBy` chain — breadth-first, `done` tasks excluded on the way in
 * and each task counted once.
 *
 * It is the only ranking worth having here, because it answers "what do I do
 * first" rather than "what is urgent".
 */
export function unblocks(task: NeedtTask, tasks: readonly NeedtTask[]): number {
  let perList = unblocksCache.get(tasks);
  if (!perList) {
    perList = new Map<string, number>();
    unblocksCache.set(tasks, perList);
  }
  const cached = perList.get(task.id);
  if (cached !== undefined) return cached;

  const open = tasks.filter((candidate) => !candidate.done);
  const seen = new Set<string>();
  let frontier = new Set<string>([task.id]);
  let held = 0;

  while (frontier.size) {
    const next = new Set<string>();
    for (const candidate of open) {
      if (seen.has(candidate.id)) continue;
      if (candidate.blockedBy === undefined) continue;
      if (!frontier.has(candidate.blockedBy)) continue;
      seen.add(candidate.id);
      next.add(candidate.id);
      held += 1;
    }
    frontier = next;
  }

  perList.set(task.id, held);
  return held;
}

/**
 * Drop everything `unblocks` remembers. Only needed when a task list is
 * mutated in place; replacing the array is enough on its own, since the cache
 * is keyed by the list's identity.
 */
export function clearUnblocksCache(): void {
  unblocksCache = new WeakMap<object, Map<string, number>>();
}

/**
 * Who is blocking how many of the open tasks, by person id, read off
 * `waitsOn`. Derived, never stored — a count that is written down is a count
 * that goes stale.
 */
export function blocking(tasks: readonly NeedtTask[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const task of tasks) {
    if (task.done || !task.waitsOn) continue;
    out[task.waitsOn.on] = (out[task.waitsOn.on] ?? 0) + 1;
  }
  return out;
}

/* ── The record ────────────────────────────────────────────────────────── */

/**
 * Consecutive closed days, walking back from the second-to-last entry.
 *
 * Today is excluded on purpose: it is still in progress, so it cannot be
 * judged yet. Counting it would report a break every morning and a repair
 * every evening.
 */
export function streak(closedDays: readonly NeedtDayMark[]): number {
  let n = 0;
  for (let i = closedDays.length - 2; i >= 0 && closedDays[i]; i--) n++;
  return n;
}

/* ── Dates ─────────────────────────────────────────────────────────────── */

/**
 * Parse a task's day label ("4 Sep") against a reference date. The label
 * carries no year, so the nearest one wins: a label more than six months away
 * belongs to the neighbouring year, which is what makes "31 Dec" read
 * correctly on 1 January.
 *
 * Returns `null` for an absent or unparseable label — a task with no deadline
 * is a real state, not an error.
 */
export function parseDueDate(
  due: string | undefined | null,
  now: Date
): Date | null {
  if (!due) return null;
  const match = /^\s*(\d{1,2})\s+([A-Za-z]{3})/.exec(due);
  if (!match) return null;
  const day = Number(match[1]);
  const month = MONTHS.findIndex(
    (name) => name.toLowerCase() === match[2].toLowerCase()
  );
  if (month < 0) return null;

  const inThisYear = newDateFromYMD(now.getFullYear(), month, day);
  const drift = calendarDayDifference(inThisYear, now);
  if (drift > 182) return newDateFromYMD(now.getFullYear() - 1, month, day);
  if (drift < -182) return newDateFromYMD(now.getFullYear() + 1, month, day);
  return inThisYear;
}

function parseLocalDateKey(value: string | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = newDateFromYMD(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3])
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

/** The day a task occupies in planning views. A scheduled block wins over
 * its deadline because moving the block must move the card even when the
 * deadline remains later. */
export function taskDayOffset(task: NeedtTask, now: Date): number | null {
  const day =
    parseLocalDateKey(task.scheduledOn) ?? parseDueDate(task.due, now);
  if (!day) return null;
  return calendarDayDifference(startOfDay(day), startOfDay(now));
}

/** Overdue in a planning view means the task occupies a past day. */
export function isPlanningOverdue(task: NeedtTask, now: Date): boolean {
  if (task.done) return false;
  const offset = taskDayOffset(task, now);
  return offset == null ? task.overdue === true : offset < 0;
}

/**
 * Whether a task's deadline has passed. A done task is never overdue.
 *
 * The deadline is the truth; the authored `overdue` flag on a seed row is only
 * consulted when there is no date to read, so the two can never disagree on
 * screen the way the month and the week once did.
 */
export function isOverdue(task: NeedtTask, now: Date): boolean {
  if (task.done) return false;
  const due = parseDueDate(task.due, now);
  if (!due) return task.overdue === true;
  return startOfDay(due).getTime() < startOfDay(now).getTime();
}

/**
 * How many days a task has been sitting. The recorded `age` wins when it is
 * there; otherwise a deadline already in the past says how long it has been
 * waiting at minimum. `0` means nothing on the task claims it is old.
 */
export function ageInDays(task: NeedtTask, now: Date): number {
  if (typeof task.age === "number") return task.age;
  const due = parseDueDate(task.due, now);
  if (!due) return 0;
  return Math.max(0, calendarDayDifference(startOfDay(now), startOfDay(due)));
}

/** "1 Sep" — the one day label, so no two screens spell a date differently. */
export function dateLabel(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** The Monday of the week `n` weeks from the week containing `from`. */
export function shiftWeek(n: number, from: Date): Date {
  const monday = newDate(from);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + n * 7);
  return monday;
}

/* ── Lookups ───────────────────────────────────────────────────────────── */

/**
 * Resolve a project by id ("ops"), name ("Operations") or alias ("de") — the
 * three ways the same project gets referred to, through one lookup.
 *
 * Returns `null` rather than falling back to anything. A fallback here is
 * precisely how a habit with no project ended up wearing Operations' orange:
 * the missing project resolved to `"ops"` and nobody could see that the colour
 * on screen was a default rather than data.
 */
export function project(
  ref: string | null | undefined,
  projects: readonly NeedtProject[],
  aliases: NeedtProjectAliases = fixtureAliases
): NeedtProject | null {
  if (!ref) return null;
  const byId = projects.find((candidate) => candidate.id === ref);
  if (byId) return byId;
  const byName = projects.find((candidate) => candidate.name === ref);
  if (byName) return byName;
  const aliased = aliases[ref];
  if (aliased) {
    return projects.find((candidate) => candidate.id === aliased) ?? null;
  }
  return null;
}

/**
 * Resolve a person by id.
 *
 * Unlike `project`, this keeps the fixture's fallback to "you": every avatar
 * in the prototype assumes a face comes back, and an unheld task is the
 * viewer's own. It is still honest when there is no "you" in the list — then
 * it returns `null` rather than inventing a person.
 */
export function person(
  ref: string | null | undefined,
  people: readonly NeedtPerson[]
): NeedtPerson | null {
  if (ref) {
    const found = people.find((candidate) => candidate.id === ref);
    if (found) return found;
  }
  return people.find((candidate) => candidate.id === "you") ?? null;
}
