/* The grid's geometry, tested without a DOM. */
import { newDateFromYMD } from "@/lib/date-utils";

import {
  BLOCK_MIN_HEIGHT_PX,
  GRID_END_HOUR,
  GRID_START_HOUR,
  HOUR_HEIGHT_PX,
  daysRange,
  formatClock,
  heightForDuration,
  hourOfDay,
  initialScrollLeft,
  initialScrollTop,
  monthGridCells,
  nonWorkingRanges,
  snapToGrid,
  topForHour,
} from "../geometry";

describe("height is duration, without exception", () => {
  it("gives an hour its full 46px scale", () => {
    expect(heightForDuration(60)).toBe(HOUR_HEIGHT_PX - 4);
  });

  it("floors a short block at one readable line rather than lying about it", () => {
    expect(heightForDuration(5)).toBe(BLOCK_MIN_HEIGHT_PX);
  });

  it("never reads a box as running longer than it does", () => {
    // A 30-minute block must not be given the height a 69-minute block would
    // get (2.3x its duration, the exact regression named in the brief).
    const thirty = heightForDuration(30);
    const seventy = heightForDuration(69);
    expect(thirty).toBeLessThan(seventy);
    expect(thirty).toBeGreaterThan(0);
  });
});

describe("topForHour", () => {
  it("places the grid's own start at 0", () => {
    expect(topForHour(GRID_START_HOUR)).toBe(0);
  });

  it("scales linearly with the hour height", () => {
    expect(topForHour(9, 0, 46)).toBe(9 * 46);
    expect(topForHour(9.5, 0, 46)).toBe(9.5 * 46);
  });
});

describe("snapToGrid", () => {
  it("snaps to the nearest quarter hour", () => {
    expect(snapToGrid(9.1)).toBe(9);
    expect(snapToGrid(9.2)).toBe(9.25);
    expect(snapToGrid(9.4)).toBe(9.5);
  });

  it("clamps to the full 24-hour grid", () => {
    expect(snapToGrid(-1)).toBe(GRID_START_HOUR);
    expect(snapToGrid(30)).toBe(GRID_END_HOUR);
  });
});

describe("nonWorkingRanges — hatched, never hidden", () => {
  it("hatches before and after the working hours", () => {
    expect(nonWorkingRanges(9, 18)).toEqual([
      [0, 9],
      [18, 24],
    ]);
  });

  it("drops an empty range at either edge", () => {
    expect(nonWorkingRanges(0, 18)).toEqual([[18, 24]]);
    expect(nonWorkingRanges(9, 24)).toEqual([[0, 9]]);
  });

  it("covers all 24 hours between the two ranges and the working day", () => {
    const [before, after] = nonWorkingRanges(9, 18);
    expect(before[1]).toBe(9);
    expect(after[0]).toBe(18);
  });
});

describe("initialScrollTop", () => {
  it("opens scrolled to the working hours, with a half-line of headroom", () => {
    expect(initialScrollTop(9, 46, 0, 8)).toBe(9 * 46 - 8);
  });
});

describe("initialScrollLeft", () => {
  it("is the anchor's own column offset", () => {
    expect(initialScrollLeft(3, 180)).toBe(540);
  });
});

describe("formatClock", () => {
  it("formats 24-hour clock with zero-padding", () => {
    expect(formatClock(9)).toBe("09:00");
    expect(formatClock(13.5)).toBe("13:30");
  });

  it("formats 12-hour clock without minutes on the hour", () => {
    expect(formatClock(9, false)).toBe("9 am");
    expect(formatClock(13.5, false)).toBe("1:30 pm");
    expect(formatClock(0, false)).toBe("12 am");
    expect(formatClock(12, false)).toBe("12 pm");
  });
});

describe("hourOfDay", () => {
  it("reads a fractional hour off a real Date", () => {
    const d = newDateFromYMD(2026, 8, 1);
    d.setHours(13, 30, 0, 0);
    expect(hourOfDay(d)).toBeCloseTo(13.5, 5);
  });
});

describe("daysRange", () => {
  it("returns consecutive calendar days from the anchor", () => {
    const anchor = newDateFromYMD(2026, 7, 31); // 31 Aug (month is 0-indexed)
    const days = daysRange(anchor, 3);
    expect(days.map((d) => d.getDate())).toEqual([31, 1, 2]);
    expect(days[1].getMonth()).toBe(8); // September, still 0-indexed 8
  });
});

describe("monthGridCells — the lead-in is derived, never a literal", () => {
  it("produces exactly 42 cells", () => {
    const cells = monthGridCells(newDateFromYMD(2026, 8, 1), newDateFromYMD(2026, 8, 1));
    expect(cells).toHaveLength(42);
  });

  it("marks today correctly among the in-month cells", () => {
    const today = newDateFromYMD(2026, 8, 1); // Tuesday 1 Sep 2026
    const cells = monthGridCells(today, today);
    const marked = cells.filter((c) => c.isToday);
    expect(marked).toHaveLength(1);
    expect(marked[0].date.getDate()).toBe(1);
    expect(marked[0].inMonth).toBe(true);
  });

  it("derives the lead-in from the real weekday of the 1st, not a fixture index", () => {
    // 1 September 2026 is a Tuesday. Monday-first, that's lead-in 1.
    const cells = monthGridCells(newDateFromYMD(2026, 8, 1), newDateFromYMD(2026, 8, 1));
    const first = cells.findIndex((c) => c.inMonth && c.date.getDate() === 1);
    expect(first).toBe(1);
    expect(cells[0].inMonth).toBe(false);
    expect(cells[0].date.getDate()).toBe(31); // 31 Aug, the lead-in day
  });

  it("agrees with a different month's own real weekday", () => {
    // 1 November 2026 is a Sunday. Monday-first, that's lead-in 6.
    const cells = monthGridCells(newDateFromYMD(2026, 10, 1), newDateFromYMD(2026, 10, 1));
    const first = cells.findIndex((c) => c.inMonth && c.date.getDate() === 1);
    expect(first).toBe(6);
  });

  it("supports a Sunday-first week", () => {
    // 1 September 2026 is a Tuesday. Sunday-first, that's lead-in 2.
    const cells = monthGridCells(
      newDateFromYMD(2026, 8, 1),
      newDateFromYMD(2026, 8, 1),
      "sun"
    );
    const first = cells.findIndex((c) => c.inMonth && c.date.getDate() === 1);
    expect(first).toBe(2);
  });
});
