/* The adapter, tested without a DOM.
 *
 * The point of these is that resolution happens HERE. A block must never see
 * the caller's spelling of a project, must never be handed a default hue, and
 * must be able to tell "the product has no parts yet" from "this task has no
 * parts".
 */
import { projects as fixtureProjects, tasks } from "@/lib/needt/fixture";
import type { NeedtTask } from "@/lib/needt/types";

import {
  type RbInput,
  rbAgeInk,
  rbDur,
  rbFactSource,
  rbMoney,
  rbShape,
} from "../rb-shape";

const base: NeedtTask = { id: 1, title: "Sign the factory quote", done: false };

const task = (over: Partial<RbInput> = {}): RbInput => ({ ...base, ...over });

describe("resolving the project", () => {
  it("resolves an id", () => {
    const shape = rbShape(task({ project: "ops" }));
    expect(shape.project).toBe("ops");
    expect(shape.where).toBe("Operations");
    expect(shape.hue).toBe("#FF7A45");
    expect(shape.glyph).toBe("briefcase");
  });

  it("resolves a display name", () => {
    expect(rbShape(task({ project: "Design system" })).project).toBe("ds");
  });

  it("resolves an alias", () => {
    expect(rbShape(task({ project: "de" })).project).toBe("german");
    expect(rbShape(task({ project: "de" })).where).toBe("German");
  });

  it("labels from the resolved project, never the caller's spelling", () => {
    /* The grid says "ops", the columns say "Operations". Both must print
       "Operations" — passing the input through is what put `ops` on screen. */
    expect(rbShape(task({ project: "ops" })).where).toBe(
      rbShape(task({ project: "Operations" })).where
    );
  });

  it("never falls back to a default project", () => {
    const none = rbShape(task({ project: null }));
    expect(none.project).toBeNull();
    expect(none.where).toBeNull();
    expect(none.hue).toBeNull();
    expect(none.glyph).toBeNull();
    expect(rbShape(task({ project: "not-a-project" })).project).toBeNull();
  });

  it("lets a calendar's hue override the project's", () => {
    expect(rbShape(task({ project: "ops", hue: "var(--info)" })).hue).toBe(
      "var(--info)"
    );
  });

  it("accepts a registry of its own", () => {
    const mine = [{ id: "x", name: "Mine", hue: "#000", glyph: "heart" }];
    expect(rbShape(task({ project: "x" }), { projects: mine }).where).toBe(
      "Mine"
    );
    expect(
      rbShape(task({ project: "ops" }), { projects: mine }).project
    ).toBeNull();
  });
});

describe("three-state fields", () => {
  it("keeps a missing capability as null", () => {
    const shape = rbShape(
      task({ parts: null, entry: null, value: null, movedFrom: null })
    );
    expect(shape.parts).toBeNull();
    expect(shape.entry).toBeNull();
    expect(shape.value).toBeNull();
    expect(shape.movedFrom).toBeNull();
  });

  it("keeps an empty list as an empty list, not as null", () => {
    expect(rbShape(task({ parts: [] })).parts).toEqual([]);
  });

  it("treats an absent field as the task having none", () => {
    expect(rbShape(task()).parts).toEqual([]);
    expect(rbShape(task()).entry).toBeNull();
  });

  it("copies parts rather than aliasing the stored array", () => {
    const parts = [{ title: "Photograph the shell", done: false }];
    const shape = rbShape(task({ parts }));
    expect(shape.parts).toEqual(parts);
    expect(shape.parts).not.toBe(parts);
  });
});

describe("what the surface decides", () => {
  it("gives the time span to the grid alone", () => {
    const pinned = task({ from: "10:00", to: "11:40" });
    expect(rbShape(pinned, { layout: "block" }).from).toBe("10:00");
    expect(rbShape(pinned, { layout: "card" }).from).toBeNull();
    expect(rbShape(pinned, { layout: "row" }).to).toBeNull();
    expect(rbShape(pinned).from).toBeNull();
  });

  it("drops what a dense surface cannot afford", () => {
    const rich = task({
      project: "ops",
      entry: "Open the billing page",
      note: "A note",
      link: "app.slack.com/plans",
      attachment: "Q3.pdf",
      og: { site: "slack.com", title: "Slack" },
    });
    const dense = rbShape(rich, { dense: true });
    expect(dense.where).toBeNull();
    expect(dense.entry).toBeNull();
    expect(dense.note).toBeNull();
    expect(dense.link).toBeNull();
    expect(dense.attachment).toBeNull();
    expect(dense.og).toBeNull();
    /* The project itself still resolves — only its label was dropped. */
    expect(dense.project).toBe("ops");
    expect(dense.hue).toBe("#FF7A45");
  });

  it("can suppress the scheduler's reason", () => {
    const placed = task({ reason: "Your longest quiet stretch today" });
    expect(rbShape(placed).reason).toBe("Your longest quiet stretch today");
    expect(rbShape(placed, { reason: false }).reason).toBeNull();
  });

  it("reads the prototype's second spelling of a note", () => {
    expect(rbShape(task({ context: "From the thread" })).note).toBe(
      "From the thread"
    );
    expect(rbShape(task({ note: "Mine", context: "Theirs" })).note).toBe(
      "Mine"
    );
  });
});

describe("the defaults", () => {
  it("assumes a block may be moved unless it says otherwise", () => {
    expect(rbShape(task()).movable).toBe(true);
    expect(rbShape(task({ movable: false })).movable).toBe(false);
    expect(rbShape(task({ movable: true })).movable).toBe(true);
  });

  it("keeps the flags false rather than undefined", () => {
    const shape = rbShape(task());
    expect(shape.overdue).toBe(false);
    expect(shape.noSlot).toBe(false);
    expect(shape.event).toBe(false);
    expect(shape.declined).toBe(false);
  });

  it("treats an empty string as nothing to draw", () => {
    expect(rbShape(task({ place: "", risk: "", due: "" })).place).toBeNull();
  });
});

describe("what the budget reads off a shape", () => {
  it("gives an overdue block words even when none were authored", () => {
    expect(rbFactSource(rbShape(task({ overdue: true }))).risk).toBe(
      "Past due"
    );
    expect(rbFactSource(rbShape(task({ priority: "now" }))).risk).toBe(
      "Must not slip"
    );
    expect(rbFactSource(rbShape(task())).risk).toBeNull();
  });

  it("prefers the authored words", () => {
    expect(
      rbFactSource(rbShape(task({ overdue: true, risk: "Three days late" })))
        .risk
    ).toBe("Three days late");
  });

  it("shows a reason OR a reserve, never both", () => {
    const reserve = { state: "tight" as const, text: "2 h 30 min of slack" };
    const moved = rbFactSource(
      rbShape(task({ reason: "The only 100 minutes free", reserve }))
    );
    expect(moved.reason).toBe("The only 100 minutes free");
    expect(moved.reserve).toBeNull();

    const fixed = rbFactSource(
      rbShape(task({ movable: false, reason: "ignored", reserve }))
    );
    expect(fixed.reason).toBeNull();
    expect(fixed.reserve).toBe(reserve);
  });
});

describe("the formatters", () => {
  it("says a duration the way the product does", () => {
    expect(rbDur(45)).toBe("45 min");
    expect(rbDur(60)).toBe("1 h");
    expect(rbDur(100)).toBe("1 h 40 min");
    expect(rbDur(0)).toBe("0 min");
  });

  it("groups money with a space that cannot break", () => {
    expect(rbMoney(120)).toBe("€120");
    expect(rbMoney(1200)).toBe("€1 200");
    expect(rbMoney(1200000)).toBe("€1 200 000");
  });

  it("never groups money with a breaking space", () => {
    // Nothing inside a block wraps to a second line at any height. U+2009 THIN
    // SPACE renders identically to U+202F but is a line-break opportunity, and
    // it was breaking "€1 200" across two lines on the lab page — the only
    // two multi-line text nodes across 102 rendered blocks. Any separator that
    // can break fails here.
    const breakable = /[\u0020\u2000-\u200B\u205F\u3000]/;
    for (const amount of [1200, 1200000, 999, 1234567]) {
      expect(rbMoney(amount)).not.toMatch(breakable);
    }
  });

  it("steps the title down the ladder rather than badging it", () => {
    expect(rbAgeInk(null)).toBe("var(--text-primary)");
    expect(rbAgeInk(20)).toBe("var(--text-primary)");
    expect(rbAgeInk(21)).toBe("var(--text-tertiary)");
    expect(rbAgeInk(41)).toBe("var(--text-tertiary)");
    expect(rbAgeInk(42)).toBe("var(--text-quaternary)");
  });
});

describe("against the fixture", () => {
  it("shapes every seeded task without inventing a project", () => {
    for (const seeded of tasks) {
      const shape = rbShape(seeded, { layout: "block" });
      expect(shape.id).toBe(seeded.id);
      expect(shape.title).toBe(seeded.title);
      if (shape.project) {
        const found = fixtureProjects.find((p) => p.id === shape.project);
        expect(found).toBeDefined();
        expect(shape.where).toBe(found?.name);
      } else {
        expect(shape.where).toBeNull();
        expect(shape.hue).toBeNull();
      }
    }
  });
});
