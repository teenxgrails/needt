import { newDateFromYMD } from "@/lib/date-utils";
import type { NeedtDayMark, NeedtHabit } from "@/lib/needt/types";

import {
  HABIT_WINDOW_DAYS,
  WALL_LIP,
  WALL_PARKED_OPACITY,
  WALL_WIDTH,
  habitFieldDays,
  habitKeptRatio,
  habitWeekKept,
  homeParted,
  homePartOf,
  isoWeekNumber,
  wallGeometry,
} from "../logic";

const marks = (...bits: readonly NeedtDayMark[]): NeedtDayMark[] => [...bits];

describe("habitKeptRatio", () => {
  it("counts kept days in the last 14, oldest first", () => {
    const done = marks(1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1);
    expect(habitKeptRatio(done)).toEqual({ kept: 11, of: 14 });
  });

  it("reads a shorter record honestly instead of padding it", () => {
    const done = marks(1, 0, 1);
    expect(habitKeptRatio(done)).toEqual({ kept: 2, of: 3 });
  });

  it("only ever looks at the trailing window, however long the record is", () => {
    const done: NeedtDayMark[] = new Array(30).fill(0) as NeedtDayMark[];
    done[29] = 1; // today, the last entry
    done[0] = 1; // 29 days back — outside the 14-day window
    expect(habitKeptRatio(done)).toEqual({ kept: 1, of: HABIT_WINDOW_DAYS });
  });

  it("is 0 of 0 for a habit with no record at all", () => {
    expect(habitKeptRatio(marks())).toEqual({ kept: 0, of: 0 });
  });

  it("is the full window when every day was kept", () => {
    const done = new Array(14).fill(1) as NeedtDayMark[];
    expect(habitKeptRatio(done)).toEqual({ kept: 14, of: 14 });
  });

  it("is zero kept when every day was missed — a miss carries no debt, only an empty count", () => {
    const done = new Array(14).fill(0) as NeedtDayMark[];
    expect(habitKeptRatio(done)).toEqual({ kept: 0, of: 14 });
  });
});

describe("habitWeekKept", () => {
  it("counts only the last 7 days, not the full 14-day record", () => {
    // 14 entries, oldest first: the first 7 are all kept, the last 7 all missed.
    const done = marks(1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0);
    expect(habitWeekKept(done)).toBe(0);
  });
});

describe("habitFieldDays", () => {
  const habit = (done: readonly NeedtDayMark[]): NeedtHabit => ({
    id: "h",
    title: "H",
    at: null,
    project: null,
    quota: null,
    done,
  });

  it("aggregates kept-ness across habits per day, last cell is today", () => {
    const habits = [habit(marks(1, 0)), habit(marks(1, 1))];
    const days = habitFieldDays(habits, 2);
    expect(days).toEqual([
      { index: 0, kept: 2, of: 2, today: false },
      { index: 1, kept: 1, of: 2, today: true },
    ]);
  });

  it("does not backfill a habit whose record does not reach that far back", () => {
    // Window of 4; one habit only has 2 days recorded.
    const habits = [habit(marks(1, 1)), habit(marks(1, 0, 1, 1))];
    const days = habitFieldDays(habits, 4);
    // Day 0 and 1 (furthest back): only the 4-day habit has data.
    expect(days[0]).toEqual({ index: 0, kept: 1, of: 1, today: false });
    expect(days[1]).toEqual({ index: 1, kept: 0, of: 1, today: false });
    // Day 2 and 3 (most recent): both habits have data.
    expect(days[2]).toEqual({ index: 2, kept: 2, of: 2, today: false });
    expect(days[3]).toEqual({ index: 3, kept: 2, of: 2, today: true });
  });

  it("returns an empty field for an empty window", () => {
    expect(habitFieldDays([habit(marks(1))], 0)).toEqual([]);
  });
});

describe("homePartOf", () => {
  it("is Morning before 12", () => {
    expect(homePartOf(0)).toBe("Morning");
    expect(homePartOf(9)).toBe("Morning");
    expect(homePartOf(11.99)).toBe("Morning");
  });

  it("is Afternoon from 12 up to (not including) 17", () => {
    expect(homePartOf(12)).toBe("Afternoon");
    expect(homePartOf(14)).toBe("Afternoon");
    expect(homePartOf(16.99)).toBe("Afternoon");
  });

  it("is Evening from 17 on", () => {
    expect(homePartOf(17)).toBe("Evening");
    expect(homePartOf(23)).toBe("Evening");
  });

  it("is Any time for a task with no hour, not a guess", () => {
    expect(homePartOf(null)).toBe("Any time");
    expect(homePartOf(undefined)).toBe("Any time");
  });
});

describe("homeParted", () => {
  it("cuts tasks into Morning / Afternoon / Evening, each opened by one header", () => {
    const tasks = [
      { id: 1, at: 18 }, // evening
      { id: 2, at: 9 }, // morning
      { id: 3, at: 13 }, // afternoon
      { id: 4, at: 10 }, // morning
    ];
    const rows = homeParted(tasks);
    expect(rows.map((r) => (r.kind === "header" ? `#${r.part}` : r.task.id))).toEqual([
      "#Morning",
      2,
      4,
      "#Afternoon",
      3,
      "#Evening",
      1,
    ]);
  });

  it("marks only the very first row as `first`", () => {
    const rows = homeParted([{ id: 1, at: 9 }]);
    expect(rows[0]).toEqual({ kind: "header", part: "Morning", first: true });
  });

  it("does not open a header for a part with nothing in it", () => {
    const rows = homeParted([{ id: 1, at: 9 }]);
    const headers = rows.filter((r) => r.kind === "header").map((r) => r.part);
    expect(headers).toEqual(["Morning"]);
  });

  it("puts undated tasks in their own trailing bucket rather than guessing a time", () => {
    const rows = homeParted([{ id: 1, at: null }, { id: 2, at: 9 }]);
    const headers = rows.filter((r) => r.kind === "header").map((r) => r.part);
    expect(headers).toEqual(["Morning", "Any time"]);
  });

  it("returns nothing for an empty list", () => {
    expect(homeParted([])).toEqual([]);
  });

  it("keeps stable order within one part", () => {
    const tasks = [
      { id: "a", at: 9 },
      { id: "b", at: 9 },
      { id: "c", at: 9 },
    ];
    const rows = homeParted(tasks);
    expect(rows.filter((r) => r.kind === "item").map((r) => r.task.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});

describe("isoWeekNumber", () => {
  it("reads 1 September 2026 — the fixture's own today — as week 36", () => {
    expect(isoWeekNumber(newDateFromYMD(2026, 8, 1))).toBe(36);
  });

  it("reads the first Monday of an ISO year as week 1", () => {
    // 4 January 2027 is a Monday, and ISO week 1 always contains 4 January.
    expect(isoWeekNumber(newDateFromYMD(2027, 0, 4))).toBe(1);
  });
});

describe("wallGeometry", () => {
  it("leaves exactly the lip visible when parked on the left", () => {
    const g = wallGeometry("left", false);
    expect(g.translateX).toBe(-(WALL_WIDTH - WALL_LIP));
    expect(g.opacity).toBe(WALL_PARKED_OPACITY);
    expect(g.parked).toBe(true);
  });

  it("mirrors the offset on the right", () => {
    const g = wallGeometry("right", false);
    expect(g.translateX).toBe(WALL_WIDTH - WALL_LIP);
  });

  it("sits flush at zero, full opacity, once extended", () => {
    const left = wallGeometry("left", true);
    const right = wallGeometry("right", true);
    expect(left).toEqual({ translateX: 0, opacity: 1, parked: false });
    expect(right).toEqual({ translateX: 0, opacity: 1, parked: false });
  });

  it("never hides more than the shelf's own width", () => {
    const g = wallGeometry("left", false, 100, 140);
    expect(Math.abs(g.translateX)).toBe(0);
  });

  it("honours a custom width and lip", () => {
    const g = wallGeometry("right", false, 300, 40);
    expect(g.translateX).toBe(260);
  });
});
