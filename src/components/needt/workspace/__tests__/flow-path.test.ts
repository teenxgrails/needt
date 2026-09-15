/* THE MATHS OF FLOW, CHECKED.
 *
 * Two things here have to be provably right and neither needs a DOM: the
 * route a link takes between two measured cards, and which task Flow names
 * first. Both are pure functions of numbers/plain objects, so they are
 * proved here rather than by eyeballing a screenshot — see PORT.md §3
 * "Flow" and the note at the top of `flow-path.ts`.
 */
import type { NeedtPerson, NeedtTask } from "@/lib/needt/types";

import {
  blockedLine,
  flowLinkPath,
  pickFlowLead,
  routeFlowLink,
} from "../flow-path";

/* ── The route ────────────────────────────────────────────────────────── */

describe("routeFlowLink", () => {
  it("routes a right-facing pair out of the source's right side", () => {
    // `to` clears `from`'s right edge by exactly the 12px gutter.
    const from = { left: 0, right: 100, top: 0, bottom: 16 };
    const to = { left: 112, right: 200, top: 40, bottom: 56 };
    const link = routeFlowLink(from, to);

    expect(link.x1).toBe(100); // out of `from`'s right edge
    expect(link.x2).toBe(108); // into `to`'s left edge, inset 4px
    expect(link.lane).toBe(106); // midway across the 12px gap
    expect(link.y1).toBe(8);
    expect(link.y2).toBe(48);
    // The lane sits strictly between the two facing edges — a lane, not an
    // S-curve that overshoots either card.
    expect(link.lane).toBeGreaterThan(link.x1);
    expect(link.lane).toBeLessThan(link.x2 + 4);
  });

  it("routes a left-facing pair out of the source's left side — the mirror", () => {
    const from = { left: 200, right: 300, top: 0, bottom: 40 };
    const to = { left: 0, right: 150, top: 0, bottom: 40 };
    const link = routeFlowLink(from, to);

    expect(link.x1).toBe(200); // out of `from`'s LEFT edge
    expect(link.x2).toBe(154); // into `to`'s right edge, inset 4px
    expect(link.lane).toBe(175);
    // Routed leftward: the lane sits between the two facing edges.
    expect(link.lane).toBeLessThan(link.x1);
    expect(link.lane).toBeGreaterThan(link.x2);
  });

  it("bows a same-column pair around one side, outside both cards", () => {
    // Neither side clears the gutter: `to` overlaps `from` in x.
    const from = { left: 0, right: 100, top: 0, bottom: 40 };
    const to = { left: 20, right: 120, top: 80, bottom: 120 };
    const link = routeFlowLink(from, to);

    expect(link.x1).toBe(0);
    expect(link.x2).toBe(0); // same point: the lane carries the whole route
    expect(link.lane).toBe(-18); // bowed outside the nearer left edge
    expect(link.y1).toBe(20);
    expect(link.y2).toBe(100);
  });

  it("respects a caller-supplied gutter", () => {
    // A 15px gap: facing at the default 12px gutter, but too close once the
    // gutter is widened to 20px.
    const from = { left: 0, right: 100, top: 0, bottom: 20 };
    const to = { left: 115, right: 200, top: 0, bottom: 20 };

    expect(routeFlowLink(from, to, 12).x1).toBe(100); // facing
    const bowed = routeFlowLink(from, to, 20);
    expect(bowed.x1).toBe(bowed.x2); // bowed: too close for that gutter
  });

  it("clamps the corner to the shortest of the three segments it rounds", () => {
    // Horizontal runs of 6px and 2px, well under the 10px ceiling, with a
    // generous vertical run — the 2px run into the target is what binds.
    const link = routeFlowLink(
      { left: 0, right: 100, top: 0, bottom: 16 }, // y1 = 8
      { left: 112, right: 200, top: 40, bottom: 56 } // y2 = 48
    );
    expect(link.d).toBe(
      "M 100 8 L 104 8 Q 106 8 106 10 L 106 46 Q 106 48 108 48 L 108 48"
    );
  });

  it("reaches the full 10px ceiling once every segment can afford it", () => {
    const link = flowLinkPath({ x1: 100, y1: 20, x2: 146, y2: 100, lane: 125 });
    expect(link).toBe(
      "M 100 20 L 115 20 Q 125 20 125 30 L 125 90 Q 125 100 135 100 L 146 100"
    );
  });
});

/* ── The ranking ──────────────────────────────────────────────────────── */

function task(
  t: Partial<NeedtTask> & { id: number; title: string }
): NeedtTask {
  return { done: false, ...t };
}

describe("pickFlowLead", () => {
  it("names the free task that unblocks the most — not the one that merely looks urgent", () => {
    const overdue = task({
      id: 1,
      title: "Overdue but stuck",
      overdue: true,
      blockedBy: 2,
    });
    const blocker = task({ id: 2, title: "Holding the overdue one up" });
    const leverage = task({ id: 3, title: "Unremarkable, but frees two" });
    const dep4 = task({ id: 4, title: "Waits on leverage", blockedBy: 3 });
    const dep5 = task({ id: 5, title: "Also waits on leverage", blockedBy: 3 });

    const all = [overdue, blocker, leverage, dep4, dep5];
    const open = all;

    const lead = pickFlowLead(open, all);

    expect(lead).not.toBeNull();
    // The overdue task is excluded outright: it is not free, regardless of
    // how urgent it looks.
    expect(lead?.task.id).not.toBe(overdue.id);
    // `blocker` is free and unblocks one thing (the overdue task); `leverage`
    // is free and unblocks two. Leverage wins on leverage, not urgency.
    expect(lead?.task.id).toBe(leverage.id);
    expect(lead?.n).toBe(2);
  });

  it("prefers the free task with the higher count", () => {
    const a = task({ id: 1, title: "Frees one" });
    const aChild = task({ id: 2, title: "Waits on A", blockedBy: 1 });
    const b = task({ id: 10, title: "Frees three" });
    const bChildren = [11, 12, 13].map((id) =>
      task({ id, title: `Waits on B #${id}`, blockedBy: 10 })
    );

    const all = [a, aChild, b, ...bChildren];
    const lead = pickFlowLead(all, all);

    expect(lead?.task.id).toBe(b.id);
    expect(lead?.n).toBe(3);
  });

  it("returns null when nothing free unblocks anything", () => {
    const all = [
      task({ id: 1, title: "Free, unblocks nothing" }),
      task({ id: 2, title: "Also free, also unblocks nothing" }),
    ];
    expect(pickFlowLead(all, all)).toBeNull();
  });
});

/* ── The blocked line ─────────────────────────────────────────────────── */

const PEOPLE: readonly NeedtPerson[] = [
  { id: "anna", name: "Anna", initials: "AN", hue: "#4C8DFF" },
];

describe("blockedLine", () => {
  it("says nothing when nothing blocks the task", () => {
    expect(blockedLine(null, PEOPLE)).toBeNull();
  });

  it("names the blocking task for a task blocker", () => {
    const blocking = task({ id: 9, title: "Draft the launch brief" });
    expect(blockedLine({ kind: "task", task: blocking }, PEOPLE)).toBe(
      "After Draft the launch brief"
    );
  });

  it("names the person and the reason for a person blocker, resolved by id", () => {
    expect(
      blockedLine(
        { kind: "person", on: "anna", for: "the legal sign-off" },
        PEOPLE
      )
    ).toBe("Waiting on Anna for the legal sign-off");
  });

  it("falls back to the raw id when the person cannot be resolved", () => {
    expect(
      blockedLine({ kind: "person", on: "bob", for: "a review" }, PEOPLE)
    ).toBe("Waiting on bob for a review");
  });
});
