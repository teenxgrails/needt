/* The two-minute shelf's gap-finding, tested without a DOM. */
import {
  MINUTE_LEAST_PX,
  findMinuteGaps,
  pickMinuteOffers,
} from "../minute-gaps";

describe("findMinuteGaps", () => {
  // 56px/hour is the height these thresholds were tuned against in
  // `Minutes.jsx` (`const h = hourH || 56`); a block's duration has to clear
  // the pixel floor (32px) to avoid being treated as occupying more clock
  // time than it states, so the fixtures below use full-hour blocks.
  const HOUR_H = 56;

  it("offers nothing when the only gap exceeds the fifteen-minute ceiling", () => {
    const gaps = findMinuteGaps([{ start: 9, end: 9.5 }], 9, 10, HOUR_H);
    expect(gaps).toEqual([]);
  });

  it("offers a gap under fifteen minutes between two real blocks", () => {
    const gapStart = 9;
    const gapEnd = 9 + 13 / 60; // a 13-minute gap
    const gaps = findMinuteGaps(
      [
        { start: 8, end: gapStart },
        { start: gapEnd, end: gapEnd + 1 },
      ],
      8,
      gapEnd + 1,
      HOUR_H
    );
    expect(gaps).toHaveLength(1);
    expect(gaps[0].minutes).toBe(13);
    expect(gaps[0].bandPx).toBeGreaterThanOrEqual(MINUTE_LEAST_PX);
  });

  it("drops a gap that is real in the clock but draws under the pixel floor", () => {
    // No busy items — the whole [from, to) window is one 12-minute gap, well
    // inside the duration bounds, but the hour height is a hairline so its
    // drawn band cannot clear MINUTE_LEAST_PX.
    expect(findMinuteGaps([], 9, 9.2, 1)).toEqual([]);
    // The same gap, drawn at a real hour height, clears the floor and is kept.
    expect(findMinuteGaps([], 9, 9.2, 100)).toHaveLength(1);
  });
});

describe("pickMinuteOffers", () => {
  const base = { done: false, entry: "Do the thing" };

  it("drops candidates with no entry or already done", () => {
    const offers = pickMinuteOffers(
      [
        { id: 1, entry: null, done: false, dueInDays: 1 },
        { id: 2, entry: "Step", done: true, dueInDays: 1 },
        { id: 3, ...base, dueInDays: 1 },
      ],
      12
    );
    expect(offers.map((o) => o.id)).toEqual([3]);
  });

  it("sorts nearest deadline first", () => {
    const offers = pickMinuteOffers(
      [
        { id: 1, ...base, dueInDays: 5 },
        { id: 2, ...base, dueInDays: 1 },
        { id: 3, ...base, dueInDays: null },
      ],
      12
    );
    expect(offers.map((o) => o.id)).toEqual([2, 1, 3]);
  });

  it("caps at three offers with room, two without", () => {
    const many = Array.from({ length: 5 }, (_, i) => ({
      id: i,
      ...base,
      dueInDays: i,
    }));
    expect(pickMinuteOffers(many, 12)).toHaveLength(3);
    expect(pickMinuteOffers(many, 8)).toHaveLength(2);
  });
});
