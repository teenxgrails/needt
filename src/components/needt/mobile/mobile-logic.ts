/* THE PHONE SHELL'S OWN PURE LOGIC — no DOM, no React.
 *
 * Ported from `Content height and label fixes/needt-app/Mobile.jsx`'s inline
 * arithmetic (`mbDur`, the debt/today/queue filters inside `MbHome` and
 * `MobileApp`, `MbWorkspace`'s grouping). The kit computed all of this inline,
 * per component, on every render; pulled out here it is provably right
 * without mounting anything, and every screen in this directory reads the
 * same answer to "is this task due today" instead of five slightly different
 * inline filters drifting apart.
 *
 * TAP SIZES LIVE HERE TOO, as named constants rather than literals scattered
 * across every component file. "Every tap target clears 44px" is a build
 * requirement for this port (the prototype itself does not hold to it
 * uniformly — see the file header of `MobileComposer.tsx`), so a control's
 * size is one constant, imported everywhere that control is drawn, and
 * asserted in `__tests__/mobile-logic.test.ts` — a component and its test
 * cannot drift apart from a shared source the way two typed-out numbers can.
 */
import { startOfDay } from "@/lib/date-utils";
import { isPlanningOverdue, taskDayOffset } from "@/lib/needt/derive";
import { project as resolveProject } from "@/lib/needt/derive";
import type { NeedtProject, NeedtTask } from "@/lib/needt/types";

/* ── Tap sizes — the phone's own binding constant ─────────────────────────
   PORT.md's mobile brief: "Every tap target clears 44px." Named per control
   rather than repeated as a literal, so a reviewer (or a test) can see every
   control this rule applies to in one place. */
export const MOBILE_TAP_MIN = 44;

export const HEADER_BUTTON_SIZE = 44;
export const DAY_STRIP_CELL = { width: 46, height: 52 } as const;
export const HABIT_CHIP_HEIGHT = 44;
export const TAB_ITEM_HEIGHT = 50;
export const FAB_SIZE = 56;
export const QUEUE_BUTTON_HEIGHT = 44;
export const COMPOSER_HIT_SIZE = 44;

/**
 * The drawn size of the vendored send button. The design system owns this
 * number; it is repeated here only so the hit-slop can be derived from the
 * difference rather than typed as a second literal that drifts from it.
 */
export const COMPOSER_GO_SIZE = 32;
export const SETTINGS_ROW_MIN_HEIGHT = 52;
export const TASK_SHEET_ROW_HEIGHT = 44;
export const AUTH_BUTTON_HEIGHT = 48;

/** Whether a control's own footprint clears the phone's 44px floor. A
 * dimension of `undefined` (a flexible `flex: 1` axis, no fixed size) is
 * treated as satisfied — there is nothing fixed there to be too small. */
export function meetsTapMin(size: {
  width?: number;
  height?: number;
}): boolean {
  const h = size.height ?? MOBILE_TAP_MIN;
  const w = size.width ?? MOBILE_TAP_MIN;
  return h >= MOBILE_TAP_MIN && w >= MOBILE_TAP_MIN;
}

/* ── Duration, in the shell's own words ───────────────────────────────────
   Ported from `mbDur`. `rbDur` (in `../rb-shape`) assumes a real number of
   minutes and has no empty state; the phone header states "how long is left"
   for a possibly-empty queue, so the zero/undefined case is this file's own,
   not a fork of `rbDur`'s. */
export function mobileDuration(minutes: number | null | undefined): string {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/* ── Which day a task falls on, relative to "today" ───────────────────────
   Ported from `TodayForm.tsx`'s own `dueOffset` — not exported there, so
   this is a second small copy of the same one-line arithmetic rather than a
   fork of anything larger; both read `parseDueDate` the one way every
   surface resolves a day label. */
export function mobileDueOffset(task: NeedtTask, now: Date): number | null {
  return taskDayOffset(task, now);
}

export interface MobileDayLists {
  /** Overdue, open, and not `noSlot` — the wall beside today, per PORT.md. */
  debt: NeedtTask[];
  /** Due today, open, and not `noSlot`. */
  today: NeedtTask[];
}

/** Split a task list into what's overdue and what's due today, the same cut
 * `MbHome` draws — Overdue as a line you tap, Today as the list under it. */
export function mobileDayLists(
  tasks: readonly NeedtTask[],
  now: Date
): MobileDayLists {
  const debt: NeedtTask[] = [];
  const today: NeedtTask[] = [];
  for (const task of tasks) {
    if (task.done || task.noSlot) continue;
    if (isPlanningOverdue(task, now)) {
      debt.push(task);
    } else if (mobileDueOffset(task, now) === 0) {
      today.push(task);
    }
  }
  return { debt, today };
}

/** Still open for today: overdue, or due today. Feeds the tab bar's quiet
 * dot — a dot that is always lit is not a signal, so this returns 0 on a
 * clear day rather than a floor of one. */
export function mobileDueTodayCount(
  tasks: readonly NeedtTask[],
  now: Date
): number {
  const { debt, today } = mobileDayLists(tasks, now);
  return debt.length + today.length;
}

/** Waiting for a time: not done, not already placed, and not `noSlot` —
 * `noSlot` tasks have nothing to place, so the queue must never claim them
 * (PORT.md §2: "It is also excluded from the unplaced queue"). */
export function mobileQueue(tasks: readonly NeedtTask[]): NeedtTask[] {
  return tasks.filter((task) => !task.done && !task.time && !task.noSlot);
}

export function mobileQueueMinutes(tasks: readonly NeedtTask[]): number {
  return mobileQueue(tasks).reduce((sum, task) => sum + (task.est ?? 0), 0);
}

/* ── Workspace's own grouping — by resolved project, with a money sum ────
   A small, local re-derivation of `WorkspaceScreen.tsx`'s own (unexported)
   `groupByProject`, not an import of it: that function lives inside the
   desktop screen's own module and this directory's scope is `mobile/**`
   only. Same rule, same order (registry order, unresolved last) — ported
   from the one written for the desktop, not re-invented from scratch. */
export interface MobileProjectGroup {
  key: string;
  name: string;
  items: NeedtTask[];
  /** Sum of each task's `value` — 0 when nothing in the group carries one,
   * so a caller can skip drawing it rather than print "€0". */
  value: number;
}

export function mobileGroupByProject(
  tasks: readonly NeedtTask[],
  projects: readonly NeedtProject[]
): MobileProjectGroup[] {
  const byId = new Map<string, MobileProjectGroup>();
  const none: MobileProjectGroup = {
    key: "__none",
    name: "No project",
    items: [],
    value: 0,
  };
  for (const task of tasks) {
    const resolved = resolveProject(task.project, projects);
    const group = resolved
      ? (byId.get(resolved.id) ??
        (() => {
          const created: MobileProjectGroup = {
            key: resolved.id,
            name: resolved.name,
            items: [],
            value: 0,
          };
          byId.set(resolved.id, created);
          return created;
        })())
      : none;
    group.items.push(task);
    group.value += task.value ?? 0;
  }
  const ordered = projects
    .map((project) => byId.get(project.id))
    .filter((group): group is MobileProjectGroup => Boolean(group));
  if (none.items.length) ordered.push(none);
  return ordered;
}

/* ── The header's day strip ───────────────────────────────────────────────
   Ported from `MbHeader`'s own loop: two days back, four ahead, "today"
   somewhere in the middle rather than pinned to an edge — the range a
   person actually moves between. */
export const MOBILE_STRIP_BEFORE = 2;
export const MOBILE_STRIP_AFTER = 4;

export interface MobileStripDay {
  date: Date;
  dayOfMonth: number;
  isToday: boolean;
}

export function mobileDayStrip(today: Date): MobileStripDay[] {
  const days: MobileStripDay[] = [];
  for (
    let offset = -MOBILE_STRIP_BEFORE;
    offset <= MOBILE_STRIP_AFTER;
    offset++
  ) {
    const date = startOfDay(today);
    date.setDate(date.getDate() + offset);
    days.push({ date, dayOfMonth: date.getDate(), isToday: offset === 0 });
  }
  return days;
}

/* ── The four tabs ─────────────────────────────────────────────────────── */

export type MobileTabId = "home" | "calendar" | "workspace" | "docs";

export interface MobileTabDef {
  id: MobileTabId;
  label: string;
}

/** Fixed order and count: "the fifth would be the one nobody can name." */
export const MOBILE_TABS: readonly MobileTabDef[] = Object.freeze([
  { id: "home", label: "Home" },
  { id: "calendar", label: "Calendar" },
  { id: "workspace", label: "Workspace" },
  { id: "docs", label: "Docs" },
]);
