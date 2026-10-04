/* THE TWO-MINUTE SHELF — no DOM, ported from `Minutes.jsx`.
 *
 * A day is full of gaps too short to plan into. The shelf lives on the gap
 * itself: between two placed blocks, inside the working hours, and under
 * fifteen minutes — above that the scheduler can place real work and this
 * shelf would be competing with it.
 *
 * Decoupled from `NeedtTask` on purpose: this module only knows about a busy
 * interval and a candidate with an entry, a due-ness and a done flag, so it
 * can be tested without the task model and reused by anything that has gaps
 * to fill.
 */
import { HOUR_HEIGHT_PX } from "./geometry";

export interface MinuteBusyItem {
  start: number;
  end: number;
}

export interface MinuteGap {
  start: number;
  end: number;
  /** The real gap, in minutes — never the drawn band, which may be shorter
   *  once the floor below pushes the following block down. */
  minutes: number;
  /** The pixel height the gap actually has to draw in. */
  bandPx: number;
}

/** Above this, the scheduler places real work; the shelf stays out of it. */
export const MINUTE_GAP_MAX_HOURS = 0.25;
/** Below this, there is nothing worth offering. */
export const MINUTE_GAP_MIN_HOURS = 0.1;

export const MINUTE_FLOOR_PX = 32;
export const MINUTE_LEAST_PX = 12;

/**
 * Every offcut of the day between `from` and `to`, long enough to be worth
 * offering and short enough not to compete with the scheduler.
 */
export function findMinuteGaps(
  items: readonly MinuteBusyItem[],
  from: number,
  to: number,
  hourHeight: number = HOUR_HEIGHT_PX
): MinuteGap[] {
  const floor = MINUTE_FLOOR_PX / hourHeight;
  const busy = [...items].sort((a, b) => a.start - b.start);
  const out: Array<[number, number]> = [];
  let at = from;
  for (const item of busy) {
    if (item.start > at) out.push([at, item.start]);
    at = Math.max(at, item.start + Math.max(item.end - item.start, floor));
  }
  if (at < to) out.push([at, to]);

  return out
    .filter(
      ([s, e]) =>
        e - s >= MINUTE_GAP_MIN_HOURS &&
        e - s <= MINUTE_GAP_MAX_HOURS &&
        (e - s) * hourHeight >= MINUTE_LEAST_PX
    )
    .map(([s, e]) => ({
      start: s,
      end: e,
      minutes: Math.round((e - s) * 60),
      bandPx: (e - s) * hourHeight,
    }));
}

export interface MinuteCandidate {
  id: string | number;
  entry: string | null | undefined;
  done: boolean;
  /** Days until due, or `null` for nothing to sort by. Nearest first. */
  dueInDays: number | null;
}

/**
 * What a gap can hold: entries whose two minutes fit, nearest deadline
 * first — a small step on something due tomorrow outranks the same step on
 * something due next month.
 */
export function pickMinuteOffers<T extends MinuteCandidate>(
  candidates: readonly T[],
  gapMinutes: number
): T[] {
  return candidates
    .filter((c) => c.entry && !c.done)
    .sort(
      (a, b) =>
        (a.dueInDays ?? Number.POSITIVE_INFINITY) -
        (b.dueInDays ?? Number.POSITIVE_INFINITY)
    )
    .slice(0, gapMinutes >= 10 ? 3 : 2);
}
