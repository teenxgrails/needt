/* The height and width logic, tested without a DOM.
 *
 * These are the assertions the design is actually made of: the header has one
 * source, the ranked list keeps its order and its heights, a fact is shown
 * whole or not shown, and a missing capability costs the budget nothing.
 */
import {
  RB_FACTS,
  RB_HEADER,
  RB_OPEN_MIN,
  RB_RAIL,
  RB_RAIL_WIDE,
  RB_TILE,
  RB_ZONES,
  type RbFactSource,
  rbBudget,
  rbCapability,
  rbFactHeight,
  rbHeightTier,
  rbLayout,
  rbRank,
  rbSpendHeight,
  rbWidthPlan,
  rbWidthTier,
  rbZoneFacts,
} from "../rb-layout";

describe("the header has one source", () => {
  it("is the tile plus the padding above it", () => {
    expect(RB_HEADER).toBe(RB_TILE + 9);
  });

  it("is what the open threshold is measured from", () => {
    expect(RB_OPEN_MIN).toBeGreaterThan(RB_HEADER);
    expect(RB_OPEN_MIN - RB_HEADER).toBe(13);
  });
});

describe("the collapse order", () => {
  const RANKED = [
    "place",
    "entry",
    "link",
    "attachment",
    "preview",
    "note",
  ] as const;

  it("keeps the handoff's six facts in the handoff's order", () => {
    const ranks = RANKED.map(rbRank);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(ranks.every((rank) => rank >= 0)).toBe(true);
  });

  it("keeps the handoff's heights", () => {
    expect(rbFactHeight("place")).toBe(29);
    expect(rbFactHeight("entry")).toBe(28);
    expect(rbFactHeight("link")).toBe(29);
    expect(rbFactHeight("attachment")).toBe(29);
    expect(rbFactHeight("preview")).toBe(60);
    expect(rbFactHeight("note")).toBe(20);
  });

  it("ranks where you have to be above how to start", () => {
    expect(rbRank("place")).toBeLessThan(rbRank("entry"));
    expect(rbRank("risk")).toBeLessThan(rbRank("entry"));
    expect(rbRank("entry")).toBeLessThan(rbRank("note"));
  });

  it("names every fact exactly once", () => {
    const kinds = RB_FACTS.map((fact) => fact.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
  });
});

describe("three-state fields", () => {
  it("tells a missing capability from a task that has none", () => {
    expect(rbCapability(null)).toBe("absent");
    expect(rbCapability(undefined)).toBe("none");
    expect(rbCapability([])).toBe("none");
    expect(rbCapability("")).toBe("none");
    expect(rbCapability("Cedar")).toBe("has");
    expect(rbCapability([1])).toBe("has");
    expect(rbCapability(0)).toBe("has");
  });

  it("skips a null row without drawing a hole", () => {
    const withNulls: RbFactSource = {
      place: "Cedar",
      entry: null,
      link: null,
      note: "She mentioned the ceramic set twice.",
    };
    expect(rbBudget(withNulls).map((fact) => fact.kind)).toEqual([
      "place",
      "note",
    ]);
  });

  it("costs the budget nothing when the capability is absent", () => {
    const withEntry = rbBudget({ place: "Cedar", entry: "Open the module" });
    const withoutEntry = rbBudget({ place: "Cedar", entry: null });
    const tall = 200;
    expect(rbSpendHeight(withEntry, tall).spent).toBe(
      RB_HEADER + (RB_ZONES.meta.pad + 29) + (RB_ZONES.control.pad + 28)
    );
    expect(rbSpendHeight(withoutEntry, tall).spent).toBe(
      RB_HEADER + (RB_ZONES.meta.pad + 29)
    );
  });
});

describe("the budget", () => {
  const full: RbFactSource = {
    place: "Cedar",
    risk: "Three days late",
    reason: "Your longest quiet stretch today",
    moved: "Tuesday",
    where: "Operations",
    reserve: { state: "ok", text: "You put this here" },
    entry: "Open the billing page",
    link: "app.slack.com/plans",
    attachment: "Q3-roadmap.pdf",
    preview: { site: "slack.com", title: "Slack" },
    note: "She mentioned it twice.",
  };

  it("lists what the block has, in rank order", () => {
    expect(rbBudget(full).map((fact) => fact.kind)).toEqual([
      "place",
      "risk",
      "reason",
      "moved",
      "where",
      "reserve",
      "entry",
      "link",
      "attachment",
      "preview",
      "note",
    ]);
  });

  it("expands a group's tasks to one row each", () => {
    const facts = rbBudget({ tasks: [{}, {}, {}] });
    expect(facts).toHaveLength(3);
    expect(facts.map((fact) => fact.key)).toEqual(["t0", "t1", "t2"]);
    expect(facts.every((fact) => fact.h === 26)).toBe(true);
    expect(facts.map((fact) => fact.index)).toEqual([0, 1, 2]);
  });

  it("groups facts by the stack they are drawn in", () => {
    const facts = rbBudget(full);
    expect(rbZoneFacts(facts, "control").map((f) => f.kind)).toEqual(["entry"]);
    expect(rbZoneFacts(facts, "og").map((f) => f.kind)).toEqual(["preview"]);
    expect(rbZoneFacts(facts, "meta").map((f) => f.kind)).toEqual([
      "place",
      "where",
      "link",
      "attachment",
    ]);
    expect(rbZoneFacts(facts, "line").map((f) => f.kind)).toEqual([
      "risk",
      "reason",
      "moved",
      "reserve",
      "note",
    ]);
  });
});

describe("spending a height", () => {
  const facts = rbBudget({
    place: "Cedar",
    entry: "Open the module",
    note: "A short note",
  });

  it("takes every fact when there is nothing to ration", () => {
    const spend = rbSpendHeight(facts, null);
    expect(spend.shown).toHaveLength(3);
    expect(spend.spent).toBeNull();
  });

  it("shows a fact whole or not at all", () => {
    /* Room for the header and the 29px place row, and one pixel short of the
       28px entry row. The entry is not drawn at 27px — it is not drawn. */
    const height =
      RB_HEADER + (RB_ZONES.meta.pad + 29) + (RB_ZONES.control.pad + 28) - 1;
    const spend = rbSpendHeight(facts, height);
    expect(spend.shown.map((f) => f.kind)).toEqual(["place", "note"]);
    expect(spend.spent).toBe(
      RB_HEADER + (RB_ZONES.meta.pad + 29) + (RB_ZONES.line.pad + 20)
    );
  });

  it("never spends more than it was given", () => {
    for (let height = 0; height <= 240; height += 1) {
      const spend = rbSpendHeight(facts, height);
      if (spend.shown.length) expect(spend.spent).toBeLessThanOrEqual(height);
    }
  });

  it("bills what the render spends, per stack", () => {
    /* The numbers the component's style objects actually use. A budget that
       disagrees with them is a budget that clips. */
    expect(RB_ZONES.line).toEqual({ pad: 6, gap: 3 });
    expect(RB_ZONES.task).toEqual({ pad: 14, gap: 3 });
    expect(RB_ZONES.control).toEqual({ pad: 8, gap: 6 });
    expect(RB_ZONES.og).toEqual({ pad: 8, gap: 0 });
    expect(RB_ZONES.meta).toEqual({ pad: 16, gap: 6 });
  });

  it("charges the padding once and the gap thereafter", () => {
    const two = rbBudget({ place: "Cedar", link: "example.com" });
    const spend = rbSpendHeight(two, 400);
    expect(spend.shown).toHaveLength(2);
    expect(spend.spent).toBe(
      RB_HEADER + (RB_ZONES.meta.pad + 29) + (RB_ZONES.meta.gap + 29)
    );
  });

  it("draws nothing at all below the header", () => {
    expect(rbSpendHeight(facts, RB_HEADER).shown).toEqual([]);
    expect(rbSpendHeight(facts, 0).shown).toEqual([]);
  });

  it("lets a short fact take the room a tall one could not", () => {
    const withPreview = rbBudget({
      preview: { site: "slack.com", title: "Slack" },
      note: "A short note",
    });
    const height = RB_HEADER + RB_ZONES.line.pad + 20;
    expect(rbSpendHeight(withPreview, height).shown.map((f) => f.kind)).toEqual(
      ["note"]
    );
  });
});

describe("content by height", () => {
  it("walks the handoff's ladder", () => {
    expect(rbHeightTier(0)).toBe("title");
    expect(rbHeightTier(21)).toBe("title");
    expect(rbHeightTier(22)).toBe("title-time-inline");
    expect(rbHeightTier(39)).toBe("title-time-inline");
    expect(rbHeightTier(40)).toBe("title-time-stacked");
    expect(rbHeightTier(70)).toBe("title-time-stacked");
    expect(rbHeightTier(71)).toBe("title-time-meta");
  });

  it("gives a block that fits everything it can say", () => {
    expect(rbHeightTier(null)).toBe("title-time-meta");
  });
});

describe("content by width", () => {
  it("walks the handoff's ladder", () => {
    expect(rbWidthTier(null)).toBe("full");
    expect(rbWidthTier(240)).toBe("full");
    expect(rbWidthTier(120)).toBe("full");
    expect(rbWidthTier(119)).toBe("no-dot");
    expect(rbWidthTier(90)).toBe("no-dot");
    expect(rbWidthTier(89)).toBe("no-checkbox");
    expect(rbWidthTier(64)).toBe("no-checkbox");
    expect(rbWidthTier(63)).toBe("chip");
  });

  it("drops the project dot first", () => {
    const plan = rbWidthPlan(100);
    expect(plan.showProjectDot).toBe(false);
    expect(plan.checkboxInFlow).toBe(true);
    expect(plan.rail).toBe(RB_RAIL);
  });

  it("takes the checkbox out of the flow and thickens the rail", () => {
    const plan = rbWidthPlan(80);
    expect(plan.checkboxInFlow).toBe(false);
    expect(plan.checkboxOnHover).toBe(true);
    expect(plan.rail).toBe(RB_RAIL_WIDE);
    expect(plan.asChip).toBe(false);
  });

  it("is cumulative — a chip has given up everything above it", () => {
    const plan = rbWidthPlan(50);
    expect(plan.asChip).toBe(true);
    expect(plan.showProjectDot).toBe(false);
    expect(plan.checkboxInFlow).toBe(false);
    expect(plan.rail).toBe(RB_RAIL_WIDE);
  });
});

describe("the whole plan", () => {
  const source: RbFactSource = {
    place: "Cedar",
    entry: "Open the module",
    note: "A short note",
  };

  it("treats a null height as the request to fit", () => {
    const plan = rbLayout({ weight: "open", source });
    expect(plan.fits).toBe(true);
    expect(plan.open).toBe(true);
    expect(plan.shown).toHaveLength(3);
  });

  it("treats an explicit fit the same way", () => {
    const plan = rbLayout({ weight: "open", height: 44, fit: true, source });
    expect(plan.fits).toBe(true);
    expect(plan.height).toBeNull();
    expect(plan.shown).toHaveLength(3);
  });

  it("does not open a block that cannot afford to", () => {
    const plan = rbLayout({ weight: "open", height: RB_OPEN_MIN - 1, source });
    expect(plan.open).toBe(false);
    expect(plan.shown).toEqual([]);
  });

  it("opens at the threshold", () => {
    expect(rbLayout({ weight: "open", height: RB_OPEN_MIN, source }).open).toBe(
      true
    );
  });

  it("never opens a compressed block that was given a height", () => {
    const plan = rbLayout({ weight: "compressed", height: 200, source });
    expect(plan.open).toBe(false);
    expect(plan.shown).toEqual([]);
  });

  it("spends nothing on a row or a declined block", () => {
    expect(rbLayout({ weight: "row", source }).open).toBe(false);
    expect(rbLayout({ weight: "declined", height: 38, source }).shown).toEqual(
      []
    );
  });

  it("still reports the full budget when it could not afford it", () => {
    const plan = rbLayout({ weight: "open", height: 60, source });
    expect(plan.budget).toHaveLength(3);
    expect(plan.shown.length).toBeLessThan(plan.budget.length);
  });
});
