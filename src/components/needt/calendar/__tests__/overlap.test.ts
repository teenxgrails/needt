/* The overlap algorithm, tested without a DOM — this is the part of the
 * calendar port that has to be provably right. Units are hours-as-float
 * throughout; the algorithm itself is unit-agnostic.
 */
import {
  CASCADE_INDENT_PX,
  type OverlapItem,
  type OverlapSlot,
  buildOverlapClusters,
  intervalsOverlap,
  isCascade,
  layoutOverlap,
  overlapSlotBox,
} from "../overlap";

function item(id: string, start: number, end: number): OverlapItem {
  return { id, start, end };
}

function slotFor(slots: OverlapSlot[], id: string): OverlapSlot {
  const found = slots.find((s) => (s.kind === "chip" ? s.ids.includes(id) : s.id === id));
  if (!found) throw new Error(`no slot for ${id}`);
  return found;
}

describe("intervalsOverlap", () => {
  it("is false for two blocks that merely touch", () => {
    expect(intervalsOverlap(item("a", 9, 10), item("b", 10, 11))).toBe(false);
  });

  it("is true for a genuine overlap", () => {
    expect(intervalsOverlap(item("a", 9, 10), item("b", 9.5, 10.5))).toBe(true);
  });
});

describe("full width — the non-overlap case", () => {
  it("gives every non-overlapping block full width", () => {
    const items = [item("a", 9, 10), item("b", 11, 12), item("c", 8, 8.5)];
    const slots = layoutOverlap(items);
    expect(slots).toHaveLength(3);
    for (const slot of slots) {
      expect(slot.kind).toBe("full");
    }
  });

  it("gives two blocks that merely touch full width, not a split", () => {
    const items = [item("a", 9, 10), item("b", 10, 11)];
    const slots = layoutOverlap(items);
    expect(slots.every((s) => s.kind === "full")).toBe(true);
  });
});

describe("cascade — both halves of the AND must hold", () => {
  it("cascades when the overlap is under half of BOTH durations", () => {
    // a: 9-11 (2h), b: 10:30-12 (1.5h). Overlap 9-11 ∩ 10.5-12 = 0.5h.
    // 0.5 < 1 (half of a) and 0.5 < 0.75 (half of b) — both hold.
    const a = item("a", 9, 11);
    const b = item("b", 10.5, 12);
    expect(isCascade(a, b)).toBe(true);

    const slots = layoutOverlap([a, b]);
    expect(slotFor(slots, "a")).toEqual({ kind: "full", id: "a", z: 0 });
    expect(slotFor(slots, "b")).toEqual({
      kind: "cascade",
      id: "b",
      indent: CASCADE_INDENT_PX,
      z: 1,
    });
  });

  it("does NOT cascade when only one duration's half-test holds", () => {
    // This is the shipped bug: testing only one duration. a: 9-10 (1h, half
    // 0.5h), b: 9:45-12:45 (3h, half 1.5h). Overlap 9-10 ∩ 9.75-12.75 = 0.25h.
    // 0.25 < 0.5 (a's half) holds, but 0.25 < 1.5 (b's half) ALSO holds here —
    // so pick a case where exactly one half-test fails instead.
    // a: 9-11 (2h, half 1h), b: 10-10.9 (0.9h, half 0.45h).
    // overlap = min(11,10.9) - max(9,10) = 0.9h.
    // 0.9 < 1 (a's half) holds; 0.9 < 0.45 (b's half) does NOT hold.
    const a = item("a", 9, 11);
    const b = item("b", 10, 10.9);
    expect(isCascade(a, b)).toBe(false);

    const slots = layoutOverlap([a, b]);
    expect(slots.every((s) => s.kind === "column")).toBe(true);
  });

  it("does not cascade at all when the overlap is at least half of one duration", () => {
    const a = item("a", 9, 10);
    const b = item("b", 9.5, 10.5);
    expect(isCascade(a, b)).toBe(false);
    const slots = layoutOverlap([a, b]);
    expect(slots.every((s) => s.kind === "column")).toBe(true);
  });
});

describe("n columns — three or more, never a cascade", () => {
  it("splits three mutually overlapping blocks into three columns", () => {
    const items = [item("a", 9, 12), item("b", 9.5, 11), item("c", 10, 10.5)];
    const slots = layoutOverlap(items);
    expect(slots).toHaveLength(3);
    expect(slots.every((s) => s.kind === "column")).toBe(true);
    const columns = (slots[0] as { kind: "column"; columns: number }).columns;
    expect(columns).toBe(3);
    const lanes = slots.map((s) => (s as { kind: "column"; lane: number }).lane).sort();
    expect(lanes).toEqual([0, 1, 2]);
  });

  it("orders lane assignment by start then by duration descending", () => {
    // Two blocks share the same start; the longer one is assigned first
    // (and so takes the lower lane) per "start then duration descending".
    const short = item("short", 9, 9.5);
    const long = item("long", 9, 10.5);
    const third = item("third", 9.25, 9.75); // overlaps both
    const slots = layoutOverlap([short, long, third]);
    const laneOf = (id: string) =>
      (slotFor(slots, id) as { kind: "column"; lane: number }).lane;
    expect(laneOf("long")).toBeLessThan(laneOf("short"));
  });

  it("never cascades once a cluster reaches three", () => {
    const items = [item("a", 9, 9.2), item("b", 9.05, 9.15), item("c", 9.05, 9.15)];
    const slots = layoutOverlap(items);
    expect(slots.some((s) => s.kind === "cascade")).toBe(false);
  });
});

describe("collapse to a chip under 64px", () => {
  it("collapses an n-column split when the resulting column width is under 64px", () => {
    const items = [item("a", 9, 10), item("b", 9.5, 10.5)];
    // 2 columns over 100px with a 4px gutter -> (100-4)/2 = 48px < 64px.
    const slots = layoutOverlap(items, { containerWidth: 100 });
    expect(slots).toEqual([{ kind: "chip", ids: ["a", "b"], z: 2 }]);
  });

  it("does not collapse when the column width clears 64px", () => {
    const items = [item("a", 9, 10), item("b", 9.5, 10.5)];
    // (200-4)/2 = 98px, clears the floor.
    const slots = layoutOverlap(items, { containerWidth: 200 });
    expect(slots.every((s) => s.kind === "column")).toBe(true);
  });

  it("never collapses a cascade — both members keep full width", () => {
    const a = item("a", 9, 11);
    const b = item("b", 10.5, 12);
    const slots = layoutOverlap([a, b], { containerWidth: 10 });
    expect(slots.some((s) => s.kind === "chip")).toBe(false);
  });

  it("skips the collapse check entirely when no container width is given", () => {
    const items = [item("a", 9, 10), item("b", 9.5, 10.5)];
    const slots = layoutOverlap(items);
    expect(slots.every((s) => s.kind === "column")).toBe(true);
  });
});

describe("buildOverlapClusters", () => {
  it("keeps a chain together even where the ends do not touch", () => {
    // a overlaps b, b overlaps c, a and c do not overlap each other.
    const a = item("a", 9, 10);
    const b = item("b", 9.5, 11);
    const c = item("c", 10.5, 12);
    expect(intervalsOverlap(a, c)).toBe(false);
    const clusters = buildOverlapClusters([a, b, c]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toHaveLength(3);
  });
});

describe("overlapSlotBox", () => {
  it("gives a full slot the whole width", () => {
    expect(overlapSlotBox({ kind: "full", id: "a", z: 0 })).toEqual({
      left: "0px",
      width: "100%",
    });
  });

  it("returns null for a chip — it has no single item's box", () => {
    expect(overlapSlotBox({ kind: "chip", ids: ["a", "b"], z: 2 })).toBeNull();
  });
});
