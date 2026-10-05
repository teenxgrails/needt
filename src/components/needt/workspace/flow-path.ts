/* THE LINK ROUTE — from a source card's edge, through a lane in the gutter,
 * into a target card's edge. Pure geometry: two rectangles and a gutter go
 * in, an SVG path comes out. No DOM in this file, which is deliberate — see
 * PORT.md §3 "Flow": this is the half that has to be provably right, and the
 * unit tests prove it without a browser.
 *
 * A cubic between two card edges only reads when the horizontal run exceeds
 * its own control offset, and a stage board's 16px gutters never clear that
 * — the controls land past the opposite endpoint and the curve folds into a
 * vertical squiggle. Routing through a lane sidesteps the problem instead of
 * tuning it: the path is three straight segments and two quarter-turns, and
 * a quarter-turn cannot fold.
 *
 * THE RANKING lives here too, for the same reason it lives in one place
 * everywhere else in this port: "do this first" is the free task that
 * unblocks the most work, and that is a pure function of the task list —
 * `blockerOf`/`unblocks` are already memoised in `@/lib/needt/derive`, so
 * this file only combines them, never recomputes them.
 */
import {
  blockerOf,
  person as resolvePerson,
  unblocks,
} from "@/lib/needt/derive";
import type { NeedtBlocker, NeedtPerson, NeedtTask } from "@/lib/needt/types";

/* ── The route ────────────────────────────────────────────────────────── */

/**
 * A rectangle in one shared coordinate frame — a measured card box, relative
 * to whatever scroller draws the links between them.
 */
export interface FlowRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface FlowLink {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Where the lane's vertical run sits, in the gutter between the cards. */
  lane: number;
  /** Routed through the lane: out of `from`'s side, down the lane, into
   *  `to`'s side. Ready for an SVG `<path d>`. */
  d: string;
}

/** How much daylight two edges need before a lane can sit between them. */
const DEFAULT_GUTTER = 12;
/** How far outside the nearer edge a same-column pair's lane bows. */
const BOW_INSET = 18;
/** The short run into the target's edge, so the line does not touch the
 *  card exactly at its boundary. */
const LANE_INSET = 4;
/** The largest corner a lane's turn may round. */
const MAX_CORNER = 10;

/**
 * Which sides of `from` and `to` actually face each other, and where the
 * lane sits between them — measurement, not a guess.
 *
 * Three cases, tried in order:
 *  - `to` clears `from`'s right edge by at least `gutter`: route out of
 *    `from`'s right side, lane midway across the gap — a RIGHT-FACING pair.
 *  - `from` clears `to`'s right edge by at least `gutter`: the mirror, out
 *    of `from`'s LEFT side.
 *  - Neither: the two sit in the same column, or closer than the gutter
 *    allows a lane to sit between them, so the lane bows around whichever
 *    left edge is nearer, outside both cards.
 *
 * Stage order and dependency order are independent — a task in a later
 * stage can block one in an earlier stage — so all three cases are ordinary,
 * not edge cases.
 */
export function routeFlowLink(
  from: FlowRect,
  to: FlowRect,
  gutter: number = DEFAULT_GUTTER
): FlowLink {
  const y1 = (from.top + from.bottom) / 2;
  const y2 = (to.top + to.bottom) / 2;

  let x1: number;
  let x2: number;
  let lane: number;
  if (to.left - from.right >= gutter) {
    x1 = from.right;
    x2 = to.left - LANE_INSET;
    lane = (from.right + to.left) / 2;
  } else if (from.left - to.right >= gutter) {
    x1 = from.left;
    x2 = to.right + LANE_INSET;
    lane = (from.left + to.right) / 2;
  } else {
    x1 = Math.min(from.left, to.left);
    x2 = x1;
    lane = x1 - BOW_INSET;
  }

  return { x1, y1, x2, y2, lane, d: flowLinkPath({ x1, y1, x2, y2, lane }) };
}

/**
 * The path itself, given the four points `routeFlowLink` measured: out of
 * `(x1, y1)`, down the lane, into `(x2, y2)`.
 *
 * The corner is `min(10, …)` of the three segments it rounds — the two
 * horizontal runs into the lane and half the vertical run down it — so a
 * short run never rounds past its own length. Exported on its own so the
 * clamp can be tested directly against hand-placed points, without also
 * exercising the facing/bow decision above.
 */
export function flowLinkPath(link: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  lane: number;
}): string {
  const { x1, y1, x2, y2, lane } = link;
  const r = Math.min(
    MAX_CORNER,
    Math.abs(lane - x1),
    Math.abs(x2 - lane),
    Math.abs(y2 - y1) / 2
  );
  const dx1 = lane >= x1 ? 1 : -1;
  const dx2 = x2 >= lane ? 1 : -1;
  const dy = y2 >= y1 ? 1 : -1;
  return [
    "M",
    x1,
    y1,
    "L",
    lane - dx1 * r,
    y1,
    "Q",
    lane,
    y1,
    lane,
    y1 + dy * r,
    "L",
    lane,
    y2 - dy * r,
    "Q",
    lane,
    y2,
    lane + dx2 * r,
    y2,
    "L",
    x2,
    y2,
  ].join(" ");
}

/* ── The ranking ──────────────────────────────────────────────────────── */

export interface FlowLead {
  task: NeedtTask;
  /** How many open tasks this one is holding up, transitively. */
  n: number;
}

/**
 * "Do this first" — the free task (nothing blocks IT) that unblocks the most
 * other work, or `null` when no free task unblocks anything.
 *
 * Every other project view ranks by urgency; this ranks by leverage, and the
 * two disagree often enough that the difference is the point. A task that
 * looks urgent — overdue, say — but is itself waiting on something is not a
 * candidate at all: it is excluded outright, not merely out-ranked, because
 * there is nothing you can do about it today. Ties keep the earlier task in
 * `open`, so the order this returns is stable across renders that do not
 * change the data.
 */
export function pickFlowLead(
  open: readonly NeedtTask[],
  all: readonly NeedtTask[]
): FlowLead | null {
  let lead: FlowLead | null = null;
  for (const task of open) {
    if (blockerOf(task, all)) continue;
    const n = unblocks(task, all);
    if (n <= 0) continue;
    if (!lead || n > lead.n) lead = { task, n };
  }
  return lead;
}

/* ── The blocked line ─────────────────────────────────────────────────── */

/**
 * The one line a blocked task owes, in words: what it is waiting on, and why
 * it cannot move yet. `null` when nothing blocks it.
 *
 * Shared by Flow's cards and List's rows so the two surfaces cannot drift
 * into spelling the same fact two different ways.
 */
export function blockedLine(
  blocker: NeedtBlocker | null,
  people: readonly NeedtPerson[]
): string | null {
  if (!blocker) return null;
  if (blocker.kind === "task") return `After ${blocker.task.title}`;
  const who = resolvePerson(blocker.on, people);
  const name = who ? who.name : blocker.on;
  return `Waiting on ${name} for ${blocker.for}`;
}
