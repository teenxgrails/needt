/* THE DRAG'S MATHS, CHECKED — no DOM needed, and none used.
 *
 * Motion cannot be verified from the automated browser here (see
 * `cursor/__tests__/motion.test.ts`'s own note), so target resolution and
 * snapping — the part PORT.md calls out as needing to be "provably right" —
 * are proved here instead.
 */
import {
  DRAG_SNAP_HOURS,
  type DragBlockingItem,
  blockedLanding,
  describeDropTarget,
  formatDragTime,
  isDragItem,
  resolveDropTarget,
  sameDropTarget,
  snapDragTime,
  timelineTimeAt,
} from "../geometry";

describe("snapDragTime", () => {
  it("rounds to the nearest quarter hour", () => {
    expect(snapDragTime(9.1)).toBeCloseTo(9);
    expect(snapDragTime(9.2)).toBeCloseTo(9.25);
    expect(snapDragTime(9.4)).toBeCloseTo(9.5);
    expect(snapDragTime(9.6)).toBeCloseTo(9.5);
    expect(snapDragTime(9.9)).toBeCloseTo(10);
  });

  it("is a no-op on an exact quarter hour", () => {
    for (const h of [0, 0.25, 9.5, 13.75, 23.75]) {
      expect(snapDragTime(h)).toBeCloseTo(h);
    }
  });

  it("uses the documented snap", () => {
    expect(DRAG_SNAP_HOURS).toBe(0.25);
  });
});

describe("formatDragTime", () => {
  it("pads hour and minute to two digits", () => {
    expect(formatDragTime(9)).toBe("09:00");
    expect(formatDragTime(9.25)).toBe("09:15");
    expect(formatDragTime(13.5)).toBe("13:30");
    expect(formatDragTime(0)).toBe("00:00");
  });
});

describe("timelineTimeAt", () => {
  const base = { rectTop: 100, scrollTop: 0, hourH: 46, start: 0, offset: 0 };

  it("reads the hour straight from the pointer's distance down the grid", () => {
    // 46px per hour, grid starts at hour 0, pointer 92px below the rect top:
    // exactly hour 2.
    expect(timelineTimeAt(100 + 92, base)).toBeCloseTo(2);
  });

  it("honours the grid's own start hour and offset", () => {
    const geometry = { ...base, start: 6, offset: 10 };
    // 10px offset eaten first, then 46px = 1 more hour on top of the 6:00 start.
    expect(timelineTimeAt(100 + 10 + 46, geometry)).toBeCloseTo(7);
  });

  it("accounts for how far the grid has scrolled", () => {
    const geometry = { ...base, scrollTop: 46 };
    // Scrolled one hour down, so the same screen position reads one hour later.
    expect(timelineTimeAt(100, geometry)).toBeCloseTo(1);
  });

  it("snaps the result to the quarter hour", () => {
    expect(timelineTimeAt(100 + 5, base)).toBeCloseTo(snapDragTime(5 / 46));
  });

  it("falls back to 46px/hour when the grid publishes no hour height", () => {
    const geometry = { ...base, hourH: 0 };
    expect(timelineTimeAt(100 + 46, geometry)).toBeCloseTo(1);
  });
});

describe("resolveDropTarget", () => {
  it("resolves a row from its id", () => {
    expect(
      resolveDropTarget({ kind: "row", id: "42", date: null, label: "Task" })
    ).toEqual({ kind: "row", id: "42", label: "Task" });
  });

  it("refuses a row with no id", () => {
    expect(
      resolveDropTarget({ kind: "row", id: null, date: null, label: null })
    ).toBeNull();
  });

  it("resolves a day from its date", () => {
    expect(
      resolveDropTarget({
        kind: "day",
        id: null,
        date: "2026-09-11",
        label: "11 Sep",
      })
    ).toEqual({ kind: "day", date: "2026-09-11", label: "11 Sep" });
  });

  it("refuses a day with no date", () => {
    expect(
      resolveDropTarget({ kind: "day", id: null, date: null, label: null })
    ).toBeNull();
  });

  it("resolves focus with no further attributes", () => {
    expect(
      resolveDropTarget({ kind: "focus", id: null, date: null, label: null })
    ).toEqual({ kind: "focus" });
  });

  it("resolves a timeline only once a time has been computed", () => {
    const attrs = {
      kind: "timeline",
      id: null,
      date: "2026-09-11",
      label: null,
    };
    expect(resolveDropTarget(attrs)).toBeNull();
    expect(resolveDropTarget(attrs, 9.5)).toEqual({
      kind: "timeline",
      date: "2026-09-11",
      time: 9.5,
      label: "09:30",
    });
  });

  it("resolves nothing for an unrecognised kind", () => {
    expect(
      resolveDropTarget({ kind: "hover", id: null, date: null, label: null })
    ).toBeNull();
    expect(
      resolveDropTarget({ kind: null, id: null, date: null, label: null })
    ).toBeNull();
  });
});

describe("sameDropTarget", () => {
  it("is true for two rows with the same id", () => {
    expect(
      sameDropTarget(
        { kind: "row", id: "1", label: null },
        { kind: "row", id: "1", label: "different label" }
      )
    ).toBe(true);
  });

  it("is false across kinds, ids, dates or times", () => {
    expect(
      sameDropTarget({ kind: "row", id: "1", label: null }, { kind: "focus" })
    ).toBe(false);
    expect(
      sameDropTarget(
        { kind: "row", id: "1", label: null },
        { kind: "row", id: "2", label: null }
      )
    ).toBe(false);
    expect(
      sameDropTarget(
        { kind: "day", date: "2026-09-11", label: null },
        { kind: "day", date: "2026-09-12", label: null }
      )
    ).toBe(false);
    expect(
      sameDropTarget(
        { kind: "timeline", date: null, time: 9, label: "09:00" },
        { kind: "timeline", date: null, time: 9.25, label: "09:15" }
      )
    ).toBe(false);
  });

  it("treats null and null as the same landing", () => {
    expect(sameDropTarget(null, null)).toBe(true);
  });
});

describe("blockedLanding", () => {
  const items: DragBlockingItem[] = [
    { start: 9, end: 10, movable: true, title: "Deep work" },
    { start: 13, end: 13.5, movable: false, title: "1:1 Anna" },
  ];

  it("names a fixed block it would overlap", () => {
    expect(blockedLanding(items, 13, 13.5, null)).toBe("Fixed: 1:1 Anna");
  });

  it("ignores a movable block in the same span", () => {
    expect(blockedLanding(items, 9, 10, null)).toBeNull();
  });

  it("refuses time that has already gone", () => {
    expect(blockedLanding(items, 8, 8.5, 9)).toBe("Already gone");
  });

  it("lets a landing through when nothing is in the way", () => {
    expect(blockedLanding(items, 11, 12, 8)).toBeNull();
  });

  it("only counts a genuine overlap, not a touch", () => {
    // Ends exactly where the fixed block starts — touching, not overlapping.
    expect(blockedLanding(items, 12, 13, null)).toBeNull();
  });
});

describe("describeDropTarget", () => {
  it("names a day by its label, falling back to the date", () => {
    expect(
      describeDropTarget({ kind: "day", date: "2026-09-11", label: "11 Sep" })
    ).toBe("11 Sep");
    expect(
      describeDropTarget({ kind: "day", date: "2026-09-11", label: null })
    ).toBe("2026-09-11");
  });

  it("names a timeline landing by its time", () => {
    expect(
      describeDropTarget({
        kind: "timeline",
        date: null,
        time: 9.5,
        label: "09:30",
      })
    ).toBe("09:30");
  });

  it("names focus and row in the product's own words", () => {
    expect(describeDropTarget({ kind: "focus" })).toBe("Focus on this");
    expect(describeDropTarget({ kind: "row", id: "1", label: null })).toBe(
      "Move here"
    );
  });

  it("invites a drop when there is no target under the hand", () => {
    expect(describeDropTarget(null)).toBe(
      "Drop on a free slot, a day, or Focus"
    );
  });
});

describe("isDragItem", () => {
  it("is true only for the id actually being dragged", () => {
    expect(isDragItem(4, 4)).toBe(true);
    expect(isDragItem(4, 5)).toBe(false);
    expect(isDragItem(null, 4)).toBe(false);
    expect(isDragItem(undefined, 4)).toBe(false);
  });
});
