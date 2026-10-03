/* THE MATHS OF A REACH — a hand, not a spring.
 *
 * PORT.md §5. A damped spring is the obvious model and the wrong one: given a
 * sideways push it returns to line by OSCILLATING, so the cursor sways on
 * every trip. People do not sway. A human reach is a ballistic launch that
 * covers most of the distance, then a short corrective approach that lands
 * without overshoot, and its velocity profile is the minimum-jerk curve.
 *
 * Everything in this file is a pure function of numbers. That is deliberate:
 * this is the part that has to be provably right, and none of it needs a DOM
 * to prove. The component below it owns the frames and the elements; it owns
 * no arithmetic.
 *
 * THE BOW IS DECIDED BEFORE THE FIRST FRAME. `planReach` returns a frozen
 * plan and `reachAt` only reads it. Recomputing the control point per frame
 * from the remaining distance is exactly what made the old cursor wobble on
 * arrival: the curve was arguing with the easing, and the easing always won
 * the last 10% of the trip.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Only the four edges are ever read, so a DOMRect satisfies this. */
export interface Box {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/* ── THE EASING ─────────────────────────────────────────────────────────── */

/**
 * The minimum-jerk profile, `10t³ − 15t⁴ + 6t⁵`: the measured velocity curve
 * of a human reach — nothing at the ends, everything in the middle, and no
 * overshoot to correct. Zero first AND second derivative at both ends, which
 * is what makes a departure and an arrival read as a hand rather than a jump.
 */
export function acEase(t: number): number {
  const p = t <= 0 ? 0 : t >= 1 ? 1 : t;
  return p * p * p * (10 + p * (-15 + 6 * p));
}

/* ── THE DURATION ───────────────────────────────────────────────────────── */

/** The fixed cost of starting to move. */
export const REACH_BASE_MS = 210;
/** What each doubling of distance adds. */
export const REACH_DOUBLING_MS = 190;
/** The distance a doubling is measured from. */
export const REACH_SCALE_PX = 90;
/** Below this a trip stops reading as a trip. */
export const REACH_MIN_MS = 300;
/** Above this the app is being slow on purpose, which is its own insult. */
export const REACH_MAX_MS = 760;

/**
 * How long a reach takes, by distance — Fitts's law in the shape that matters
 * here: `clamp(210 + 190·log₂(d/90 + 1), 300, 760)`. Far targets take longer,
 * but far from proportionally longer, so crossing the whole screen is not five
 * times the trip of crossing a fifth of it.
 */
export function reachMs(distance: number): number {
  const d = distance > 0 ? distance : 0;
  const raw =
    REACH_BASE_MS + REACH_DOUBLING_MS * Math.log2(d / REACH_SCALE_PX + 1);
  return Math.max(REACH_MIN_MS, Math.min(REACH_MAX_MS, raw));
}

/* ── THE PATH ───────────────────────────────────────────────────────────── */

/** How far the path bows off the straight line, as a share of its length. */
export const ARC_SHARE = 0.11;
/** And the ceiling on that, so a long trip does not swing out of the window. */
export const ARC_MAX_PX = 52;

/** Which way the bow goes. It alternates; a hand does not repeat itself. */
export type ArcSide = 1 | -1;

export function nextSide(previous: ArcSide): ArcSide {
  return previous === 1 ? -1 : 1;
}

/** A trip, fixed in full before it starts. */
export interface ReachPlan {
  readonly from: Point;
  readonly to: Point;
  /** The one control point of the quadratic. Computed once, here. */
  readonly control: Point;
  /** Straight-line distance, which is what the duration is set from. */
  readonly length: number;
  readonly ms: number;
  readonly side: ArcSide;
}

/**
 * Decide the whole trip: the control point half way along and pushed
 * perpendicular by `min(len × 0.11, 52)`, and the duration from the distance.
 * The result is frozen, because a plan that can be edited mid-flight is the
 * defect this shape exists to prevent.
 */
export function planReach(from: Point, to: Point, side: ArcSide): ReachPlan {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const bow = Math.min(length * ARC_SHARE, ARC_MAX_PX) * side;
  const control: Point =
    length === 0
      ? { x: from.x, y: from.y }
      : {
          x: from.x + dx / 2 + (-dy / length) * bow,
          y: from.y + dy / 2 + (dx / length) * bow,
        };
  return Object.freeze({
    from: Object.freeze({ x: from.x, y: from.y }),
    to: Object.freeze({ x: to.x, y: to.y }),
    control: Object.freeze(control),
    length,
    ms: reachMs(length),
    side,
  });
}

/**
 * Where the hand is, `elapsedMs` into the plan: one quadratic bezier evaluated
 * at the EASED time. Reads the plan, writes nothing.
 */
export function reachAt(plan: ReachPlan, elapsedMs: number): Point {
  const e = acEase(plan.ms <= 0 ? 1 : elapsedMs / plan.ms);
  const u = 1 - e;
  return {
    x: u * u * plan.from.x + 2 * u * e * plan.control.x + e * e * plan.to.x,
    y: u * u * plan.from.y + 2 * u * e * plan.control.y + e * e * plan.to.y,
  };
}

export function reachDone(plan: ReachPlan, elapsedMs: number): boolean {
  return elapsedMs >= plan.ms;
}

/* ── HOME ───────────────────────────────────────────────────────────────── */

/** The chat pill, closed. The corner's own measurements. */
export const PILL = Object.freeze({ w: 116, h: 40 });
/** What the corner is inset by, on both edges. */
export const CORNER_GUTTER = 20;

/**
 * HOME IS THE CORNER, NOT THE ELEMENT. Measuring the chat button at run time
 * fails in the one case that matters most — a run asked for in chat — because
 * the panel is open and the "button" is a 392×496 header, so the hand emerges
 * from the middle of an open panel and returns to a place that has since
 * shrunk. The shell's bottom-right corner does not move, so the corner is
 * measured and half a pill is inset from it.
 */
export function homePoint(shell: Box): Point {
  return {
    x: shell.right - CORNER_GUTTER - PILL.w / 2,
    y: shell.bottom - CORNER_GUTTER - PILL.h / 2,
  };
}

/* ── THE MARGIN ─────────────────────────────────────────────────────────── */

/** How far into the margin the mark sits, from the row's leading edge. */
export const MARK_GUTTER = 9;
/** The mark itself: the token sheet's 6px dot. */
export const MARK_DOT = 6;
/**
 * The narrowest the margin is allowed to get. The rail's own rows sit 8px off
 * the window edge, which is a real margin but a tight one — so on a narrow
 * gutter the mark centres in it rather than being pushed flush against the
 * edge, where it would read as something clipped rather than something placed.
 */
export const MARK_MIN_INSET = MARK_DOT / 2 + 1;

/**
 * Where the receipt goes: beside the row, in the margin, at its middle. It is
 * clamped inside the shell so a row flush against the window edge still gets a
 * visible mark rather than one drawn off-screen.
 */
export function markPoint(row: Box, shell: Box): Point {
  return {
    x: Math.max(shell.left + MARK_MIN_INSET, row.left - MARK_GUTTER),
    y: row.top + (row.bottom - row.top) / 2,
  };
}

/**
 * Whether a row is still inside whatever scrolls it. A mark belongs to a row;
 * once the row has scrolled out of its own container the mark must go with it,
 * or it floats over unrelated content claiming to be about it.
 */
export function withinClip(row: Box, clip: Box): boolean {
  const middle = row.top + (row.bottom - row.top) / 2;
  return (
    middle >= clip.top &&
    middle <= clip.bottom &&
    row.right > clip.left &&
    row.left < clip.right
  );
}
