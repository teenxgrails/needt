/* THE MATHS OF A REACH, CHECKED.
 *
 * Motion cannot be verified from an automated browser here — the preview pane
 * injects `data-animations="off"` on <html> and `html[data-animations="off"] *`
 * zeroes every animation, so a computed `animation-name: none` measured there
 * proves nothing about this code. The arithmetic, though, needs no DOM at all,
 * and it is the half that has to be provably right: an easing with a kink in
 * it, a duration that does not clamp, or a bow recomputed per frame are all
 * invisible in a screenshot and obvious in a number.
 */
import {
  ARC_MAX_PX,
  ARC_SHARE,
  CORNER_GUTTER,
  MARK_DOT,
  MARK_MIN_INSET,
  PILL,
  REACH_BASE_MS,
  REACH_MAX_MS,
  REACH_MIN_MS,
  acEase,
  homePoint,
  markPoint,
  nextSide,
  planReach,
  reachAt,
  reachDone,
  reachMs,
  withinClip,
} from "../motion";

/** A central difference, which is all the derivative checks need. */
function slope(f: (t: number) => number, t: number, h = 1e-5): number {
  return (f(t + h) - f(t - h)) / (2 * h);
}

describe("the minimum-jerk easing", () => {
  it("starts at 0 and ends at 1", () => {
    expect(acEase(0)).toBe(0);
    expect(acEase(1)).toBe(1);
  });

  it("leaves and arrives at a standstill — zero first derivative at both ends", () => {
    expect(slope(acEase, 1e-4)).toBeCloseTo(0, 6);
    expect(slope(acEase, 1 - 1e-4)).toBeCloseTo(0, 6);
  });

  /* A second derivative measured by finite differences at the very ends is
     all cancellation and no signal, so it is proved instead by the order of
     the curve there: `e(t)/t²` can only tend to 0 if e, e′ AND e″ all vanish
     at 0 — if e″(0) were anything else the ratio would settle on half of it.
     The same at the far end, in `1 − t`. */
  it("leaves and arrives without a jolt — zero second derivative at both ends", () => {
    for (const t of [1e-2, 1e-3, 1e-4]) {
      expect(acEase(t) / (t * t)).toBeLessThan(11 * t);
      expect((1 - acEase(1 - t)) / (t * t)).toBeLessThan(11 * t);
    }
  });

  it("is `10t³ − 15t⁴ + 6t⁵`, and nothing near it", () => {
    for (let t = 0; t <= 1.00001; t += 0.05) {
      const expected = 10 * t ** 3 - 15 * t ** 4 + 6 * t ** 5;
      expect(acEase(t)).toBeCloseTo(expected, 12);
    }
  });

  it("never turns back: a hand does not overshoot and correct", () => {
    let previous = -1;
    for (let t = 0; t <= 1.00001; t += 0.01) {
      const value = acEase(t);
      expect(value).toBeGreaterThanOrEqual(previous);
      expect(value).toBeLessThanOrEqual(1);
      previous = value;
    }
  });

  it("is symmetric about the middle — the launch and the approach are one shape", () => {
    for (let t = 0; t <= 0.5; t += 0.05) {
      expect(acEase(t) + acEase(1 - t)).toBeCloseTo(1, 12);
    }
  });

  it("clamps outside [0, 1] rather than running away", () => {
    expect(acEase(-4)).toBe(0);
    expect(acEase(9)).toBe(1);
  });
});

describe("the duration, Fitts-style", () => {
  it("clamps at 300ms, however short the trip", () => {
    expect(reachMs(0)).toBe(REACH_MIN_MS);
    expect(reachMs(1)).toBe(REACH_MIN_MS);
    /* 210 + 190·log₂(d/90 + 1) only reaches 300 at about 35px. */
    expect(reachMs(30)).toBe(REACH_MIN_MS);
    expect(reachMs(40)).toBeGreaterThan(REACH_MIN_MS);
    expect(reachMs(-100)).toBe(REACH_MIN_MS);
  });

  it("clamps at 760ms, however long the trip", () => {
    expect(reachMs(4000)).toBe(REACH_MAX_MS);
    expect(reachMs(100000)).toBe(REACH_MAX_MS);
  });

  it("is the formula between the clamps", () => {
    for (const d of [90, 180, 300, 500]) {
      const raw = REACH_BASE_MS + 190 * Math.log2(d / 90 + 1);
      expect(reachMs(d)).toBeCloseTo(raw, 10);
      expect(reachMs(d)).toBeGreaterThan(REACH_MIN_MS);
      expect(reachMs(d)).toBeLessThan(REACH_MAX_MS);
    }
  });

  it("costs one fixed term per doubling: 90px adds exactly 190ms over nothing", () => {
    expect(reachMs(90)).toBeCloseTo(REACH_BASE_MS + 190, 10);
  });

  it("grows with distance, but far from proportionally", () => {
    const near = reachMs(120);
    const far = reachMs(600);
    expect(far).toBeGreaterThan(near);
    /* Five times the distance is nowhere near five times the trip. */
    expect(far / near).toBeLessThan(2);
  });
});

describe("the bow", () => {
  const from = { x: 0, y: 0 };
  const to = { x: 300, y: 0 };

  it("is a fixed share of the length until the ceiling", () => {
    const plan = planReach(from, { x: 200, y: 0 }, 1);
    /* Perpendicular to a rightward trip is straight up, and `side` 1 pushes
       it to the negative y. */
    expect(plan.control.x).toBeCloseTo(100, 10);
    expect(Math.abs(plan.control.y)).toBeCloseTo(200 * ARC_SHARE, 10);
  });

  it("stops at 52px, so a long trip does not swing out of the window", () => {
    const plan = planReach(from, { x: 2000, y: 0 }, 1);
    expect(Math.abs(plan.control.y)).toBeCloseTo(ARC_MAX_PX, 10);
  });

  it("alternates, so a sequence does not trace the same hook twice", () => {
    expect(nextSide(1)).toBe(-1);
    expect(nextSide(-1)).toBe(1);
    const left = planReach(from, to, 1);
    const right = planReach(from, to, -1);
    expect(Math.sign(left.control.y)).toBe(-Math.sign(right.control.y));
    expect(Math.abs(left.control.y)).toBeCloseTo(Math.abs(right.control.y), 10);
  });

  it("degenerates to the point itself when there is nowhere to go", () => {
    const plan = planReach(from, from, 1);
    expect(plan.length).toBe(0);
    expect(plan.control).toEqual(from);
    expect(reachAt(plan, 0)).toEqual(from);
  });
});

describe("the plan is made once, not per frame", () => {
  const plan = planReach({ x: 10, y: 40 }, { x: 400, y: 300 }, -1);

  it("is frozen, so no frame can edit it on its way past", () => {
    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan.control)).toBe(true);
    expect(Object.isFrozen(plan.from)).toBe(true);
    expect(Object.isFrozen(plan.to)).toBe(true);
  });

  it("evaluating it a thousand times changes nothing about it", () => {
    const before = JSON.stringify(plan);
    for (let i = 0; i <= 1000; i += 1) reachAt(plan, (plan.ms * i) / 1000);
    expect(JSON.stringify(plan)).toBe(before);
  });

  it("is the bezier of its own stored control point at every sample", () => {
    for (let i = 0; i <= 40; i += 1) {
      const elapsed = (plan.ms * i) / 40;
      const e = acEase(elapsed / plan.ms);
      const u = 1 - e;
      const point = reachAt(plan, elapsed);
      expect(point.x).toBeCloseTo(
        u * u * plan.from.x + 2 * u * e * plan.control.x + e * e * plan.to.x,
        10
      );
      expect(point.y).toBeCloseTo(
        u * u * plan.from.y + 2 * u * e * plan.control.y + e * e * plan.to.y,
        10
      );
    }
  });

  /* THE WOBBLE TEST. A bow recomputed per frame from the REMAINING distance
     shrinks as the hand approaches, which drags the path sideways at exactly
     the moment it should be settling — that is what made the old cursor sway
     on arrival. A control point fixed up front puts the peak deviation at the
     halfway parameter and keeps the deviation profile proportional to
     `e·(1 − e)`, whatever the trip. This checks the profile, which a
     per-frame bow cannot satisfy. */
  it("bows on a fixed parabola, so nothing can wobble at the end", () => {
    const straight = (e: number) => ({
      x: plan.from.x + (plan.to.x - plan.from.x) * e,
      y: plan.from.y + (plan.to.y - plan.from.y) * e,
    });

    let peak = 0;
    let peakAt = 0;
    for (let i = 1; i < 200; i += 1) {
      const e = i / 200;
      const u = 1 - e;
      const point = {
        x: u * u * plan.from.x + 2 * u * e * plan.control.x + e * e * plan.to.x,
        y: u * u * plan.from.y + 2 * u * e * plan.control.y + e * e * plan.to.y,
      };
      const line = straight(e);
      const off = Math.hypot(point.x - line.x, point.y - line.y);
      /* The deviation of a quadratic from its chord is exactly 2·e·(1−e)·bow. */
      const share = off / (2 * e * u);
      expect(share).toBeCloseTo(
        Math.hypot(
          plan.control.x - (plan.from.x + plan.to.x) / 2,
          plan.control.y - (plan.from.y + plan.to.y) / 2
        ),
        6
      );
      if (off > peak) {
        peak = off;
        peakAt = e;
      }
    }
    expect(peakAt).toBeCloseTo(0.5, 2);
  });

  it("lands exactly on the target, and says so", () => {
    expect(reachDone(plan, plan.ms - 1)).toBe(false);
    expect(reachDone(plan, plan.ms)).toBe(true);
    const end = reachAt(plan, plan.ms);
    expect(end.x).toBeCloseTo(plan.to.x, 10);
    expect(end.y).toBeCloseTo(plan.to.y, 10);
  });

  it("never passes the target on the way in — no overshoot to correct", () => {
    let previous = Infinity;
    for (let i = 100; i <= 200; i += 1) {
      const point = reachAt(plan, (plan.ms * i) / 200);
      const left = Math.hypot(plan.to.x - point.x, plan.to.y - point.y);
      expect(left).toBeLessThanOrEqual(previous + 1e-9);
      previous = left;
    }
    expect(previous).toBeCloseTo(0, 9);
  });
});

describe("home is the corner, not the element", () => {
  /* The case the rule exists for: the run was asked for in chat, so the panel
     is open and the "button" is a 392×496 header. The shell has not moved, so
     neither has home. */
  const shell = { left: 0, top: 0, right: 1440, bottom: 900 };

  it("insets half a pill from the shell's bottom-right", () => {
    expect(homePoint(shell)).toEqual({
      x: 1440 - CORNER_GUTTER - PILL.w / 2,
      y: 900 - CORNER_GUTTER - PILL.h / 2,
    });
  });

  it("does not move when the corner's element changes size", () => {
    /* Same shell, whatever register the corner is in. */
    expect(homePoint(shell)).toEqual(homePoint({ ...shell }));
  });

  it("follows the shell when the window does", () => {
    const wide = homePoint({ ...shell, right: 1920, bottom: 1080 });
    expect(wide.x).toBe(1920 - CORNER_GUTTER - PILL.w / 2);
    expect(wide.y).toBe(1080 - CORNER_GUTTER - PILL.h / 2);
  });
});

describe("the margin mark", () => {
  const shell = { left: 0, top: 0, right: 1440, bottom: 900 };

  it("sits in the margin, level with the middle of its row", () => {
    const point = markPoint(
      { left: 260, top: 100, right: 560, bottom: 140 },
      shell
    );
    expect(point.x).toBe(260 - 9);
    expect(point.y).toBe(120);
  });

  it("centres in a narrow gutter rather than being pushed flush to the edge", () => {
    /* The rail's own rows: 8px off the window edge, which is the tightest
       real margin in the product. */
    const point = markPoint({ left: 8, top: 0, right: 256, bottom: 40 }, shell);
    expect(point.x).toBe(MARK_MIN_INSET);
    expect(point.x - MARK_DOT / 2).toBeGreaterThanOrEqual(shell.left);
    expect(point.x + MARK_DOT / 2).toBeLessThanOrEqual(8);
  });

  it("goes with its row when the row scrolls out of what scrolls it", () => {
    const clip = { left: 0, top: 100, right: 300, bottom: 400 };
    expect(withinClip({ left: 10, top: 180, right: 290, bottom: 220 }, clip)) //
      .toBe(true);
    expect(withinClip({ left: 10, top: 20, right: 290, bottom: 60 }, clip)) //
      .toBe(false);
    expect(withinClip({ left: 10, top: 500, right: 290, bottom: 540 }, clip)) //
      .toBe(false);
  });

  it("counts a row as gone once its middle has left, not its first pixel", () => {
    const clip = { left: 0, top: 100, right: 300, bottom: 400 };
    /* Half out at the top: middle at 105, still in. */
    expect(withinClip({ left: 10, top: 85, right: 290, bottom: 125 }, clip)) //
      .toBe(true);
    /* Mostly out: middle at 95. */
    expect(withinClip({ left: 10, top: 75, right: 290, bottom: 115 }, clip)) //
      .toBe(false);
  });
});
