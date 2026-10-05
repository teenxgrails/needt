/* THE DRAG'S GEOMETRY AND TARGET RESOLUTION — no DOM in this file.
 *
 * Ported from `Content height and label fixes/needt-app/Drag.jsx`. Snapping,
 * where a drop would land, and whether it would be refused are all pure
 * functions of numbers and strings, so they are provably right without a
 * pointer, a frame, or a browser — PORT.md's own instruction: "Put the pure
 * parts in their own modules with unit tests: the drag's target resolution
 * and snapping." `./dom.ts` is the few places this subsystem asks the DOM a
 * question, and it is not unit tested for the same reason
 * `src/components/needt/cursor/dom.ts` is not: what it asks forces layout,
 * and layout has no meaning outside a real document.
 *
 * The prototype's comment on the whole gesture still holds: "A drop target is
 * any DOM node with data-drop; nothing registers itself, so a new landing
 * place is an attribute, not a change to this file." The shell already
 * publishes `data-drop="row"` (Sidebar's queue, `RichBlock`'s row weight),
 * `data-drop="day"` (MiniMonth's cells) and `data-drop="focus"` (the focus
 * control). `timeline` is the same contract the prototype used for a day
 * grid — nothing publishes it yet, since the calendar grid is a later
 * workstream, but it costs nothing to keep the resolver ready for it.
 */

/** A placed time snaps to the quarter hour. */
export const DRAG_SNAP_HOURS = 0.25;

/**
 * Press, then move this many pixels, before a press becomes a drag. A press
 * that does not travel stays a click — the same block can be opened, closed
 * and moved from one target.
 */
export const DRAG_THRESHOLD_PX = 4;

/** Round an hour-of-day (0–24, fractional) to the nearest quarter hour. */
export function snapDragTime(hour: number): number {
  return Math.round(hour / DRAG_SNAP_HOURS) * DRAG_SNAP_HOURS;
}

/** "09:15" from an hour-of-day. */
export function formatDragTime(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour % 1) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export interface DragPoint {
  readonly x: number;
  readonly y: number;
}

/* ── Drop targets ─────────────────────────────────────────────────────── */

/** A place in a list: the shell's rows, `data-drop="row"` + `data-id`. */
export interface RowDropTarget {
  readonly kind: "row";
  readonly id: string;
  readonly label: string | null;
}

/** A date in the mini month: `data-drop="day"` + `data-date`. */
export interface DayDropTarget {
  readonly kind: "day";
  readonly date: string;
  readonly label: string | null;
}

/** Start a focus session on it: `data-drop="focus"`. */
export interface FocusDropTarget {
  readonly kind: "focus";
}

/**
 * A time on a day grid: `data-drop="timeline"` plus the geometry attributes
 * below. Not published anywhere in the app yet — see the file header — but
 * the prototype's contract is ported in full so a calendar grid only has to
 * add the attributes, never touch this resolver.
 */
export interface TimelineDropTarget {
  readonly kind: "timeline";
  readonly date: string | null;
  readonly time: number;
  readonly label: string;
}

export type DropTarget =
  | RowDropTarget
  | DayDropTarget
  | FocusDropTarget
  | TimelineDropTarget;

/** The geometry a `data-drop="timeline"` node publishes, already read off it
 *  and (for the rect) already cached — see PORT.md §8's second rule. */
export interface TimelineGeometry {
  readonly rectTop: number;
  readonly scrollTop: number;
  readonly hourH: number;
  readonly start: number;
  readonly offset: number;
}

/**
 * Where a timeline drop would land, from a pointer Y and the node's cached
 * geometry. Pure: the caller supplies the rect instead of this file asking
 * for one, which is what keeps `getBoundingClientRect` out of `pointermove`.
 */
export function timelineTimeAt(y: number, geometry: TimelineGeometry): number {
  const { rectTop, scrollTop, hourH, start, offset } = geometry;
  const h = hourH || 46;
  return snapDragTime(start + (y - rectTop + scrollTop - offset) / h);
}

/** The attributes a `[data-drop]` node carries, already read off it. Kept
 *  apart from the DOM lookup so target resolution is a pure function of
 *  strings. */
export interface DropAttrs {
  readonly kind: string | null;
  readonly id: string | null;
  readonly date: string | null;
  readonly label: string | null;
}

/**
 * Turn a matched `[data-drop]` node's attributes into the target it names.
 * `timelineTime` is precomputed by the caller (via `timelineTimeAt`), because
 * a timeline is the one kind that needs geometry; every other kind is the
 * attributes alone. Returns `null` for an unrecognised kind, or a kind that
 * is missing the one attribute it cannot do without.
 */
export function resolveDropTarget(
  attrs: DropAttrs,
  timelineTime?: number | null
): DropTarget | null {
  switch (attrs.kind) {
    case "row":
      return attrs.id == null
        ? null
        : { kind: "row", id: attrs.id, label: attrs.label };
    case "day":
      return attrs.date == null
        ? null
        : { kind: "day", date: attrs.date, label: attrs.label };
    case "focus":
      return { kind: "focus" };
    case "timeline":
      return timelineTime == null
        ? null
        : {
            kind: "timeline",
            date: attrs.date,
            time: timelineTime,
            label: formatDragTime(timelineTime),
          };
    default:
      return null;
  }
}

/**
 * Whether two resolved targets are the same landing — the check that lets
 * the pointer's rAF loop publish nothing when neither the point nor the
 * target changed (PORT.md §8's first rule).
 */
export function sameDropTarget(
  a: DropTarget | null,
  b: DropTarget | null
): boolean {
  if (a === b) return true;
  if (!a || !b || a.kind !== b.kind) return false;
  switch (a.kind) {
    case "row":
      return b.kind === "row" && a.id === b.id;
    case "day":
      return b.kind === "day" && a.date === b.date;
    case "focus":
      return b.kind === "focus";
    case "timeline":
      return b.kind === "timeline" && a.date === b.date && a.time === b.time;
    default:
      return false;
  }
}

/* ── Refusal ──────────────────────────────────────────────────────────── */

/** What already occupies the grid, for the refusal check. */
export interface DragBlockingItem {
  readonly start: number;
  readonly end: number;
  readonly movable: boolean;
  readonly title: string;
}

/**
 * Would this landing be refused, and why? A task cannot take time that has
 * already gone, and it cannot take a block the scheduler is not allowed to
 * move. Returns the obstacle's own name — "Already gone", "Fixed: 1:1 Anna"
 * — or `null` when the landing is clear. Never a generic "can't drop here":
 * PORT.md §5 is explicit that a refusal names the obstacle.
 */
export function blockedLanding(
  items: readonly DragBlockingItem[],
  start: number,
  end: number,
  now: number | null
): string | null {
  if (now != null && end <= now) return "Already gone";
  const hit = items.find(
    (item) => item.start < end && item.end > start && !item.movable
  );
  return hit ? `Fixed: ${hit.title}` : null;
}

/* ── What the ghost says ─────────────────────────────────────────────── */

/** The line under the ghost: what will happen if the hand lets go here. */
export function describeDropTarget(target: DropTarget | null): string {
  if (!target) return "Drop on a free slot, a day, or Focus";
  switch (target.kind) {
    case "timeline":
      return target.label;
    case "day":
      return target.label ?? target.date;
    case "focus":
      return "Focus on this";
    case "row":
      return "Move here";
    default:
      return "Drop on a free slot, a day, or Focus";
  }
}

/** Is this task the one being dragged? Sources go pale while it is. */
export function isDragItem(
  dragId: number | string | null | undefined,
  taskId: number | string
): boolean {
  return dragId != null && dragId === taskId;
}
