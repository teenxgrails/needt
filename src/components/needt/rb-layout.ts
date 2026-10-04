/* THE BLOCK'S GEOMETRY, WITH NO DOM IN IT.
 *
 * Height and width are the two things about the rich block that have to be
 * provably right, so they live here as pure functions rather than inside a
 * render. The component asks this file what to draw; this file never asks the
 * component anything.
 *
 * THE ONE SOURCE OF THE HEADER. `RB_HEADER` is the tile plus the padding above
 * it, and every height calculation in the product derives from it. Repeating
 * the number is how the collapse budget and the surfaces that place the block
 * drift apart — one of them gets edited and the other does not.
 *
 * WHOLE OR NOT SHOWN. The block is handed a height and spends it down a ranked
 * list of facts. A fact that does not fit is not drawn at all; nothing is ever
 * clipped, and nothing wraps to a second line at any height. Spending does not
 * stop at the first fact that will not fit — a short fact further down the
 * list can still take the room a tall one left behind, which is the difference
 * between "the budget ran out" and "the budget ran out for THIS fact".
 */

/** The tile in an open header. The block's one hard measurement. */
export const RB_TILE = 34;

/** The padding above the tile. The rest of the header is the tile itself. */
export const RB_HEADER_PAD = 9;

/**
 * The open header: the tile plus the padding above it, and the only source of
 * that number. Derive, never repeat.
 */
export const RB_HEADER = RB_TILE + RB_HEADER_PAD;

/** Which stack a fact is drawn in. The order of the stacks is fixed. */
export type RbZone = "line" | "task" | "control" | "og" | "meta";

/**
 * WHAT A ROW ACTUALLY COSTS.
 *
 * Each zone is drawn as one stack with its own padding, and the rows inside it
 * are separated by that stack's own gap. So the first fact to open a zone pays
 * the padding and every fact after it pays the gap — and those numbers are the
 * ones in the component's style objects, not an average of them.
 *
 * Charging a flat gap per row is what let a block clip: a single 18px meta row
 * was billed 25px and drew 34px. The budget has to bill what the render spends
 * or "whole or not shown" is not a rule, it is a hope. Where the two cannot
 * agree exactly the budget over-charges — a wrapped meta strip puts two pills
 * on one line and costs less than it was billed, which loses a row rather than
 * clipping one.
 */
export interface RbZoneSpec {
  /** The stack's own vertical padding, paid once by the fact that opens it. */
  pad: number;
  /** The gap between rows inside the stack, paid by every fact after the first. */
  gap: number;
}

export const RB_ZONES: Readonly<Record<RbZone, RbZoneSpec>> = Object.freeze({
  line: { pad: 6, gap: 3 },
  task: { pad: 14, gap: 3 },
  control: { pad: 8, gap: 6 },
  og: { pad: 8, gap: 0 },
  meta: { pad: 16, gap: 6 },
});

/** What one fact costs, given whether its stack is already open. */
export function rbRowCost(zone: RbZone, opened: boolean, h: number): number {
  const spec = RB_ZONES[zone];
  return (opened ? spec.gap : spec.pad) + h;
}

/**
 * How much room above the header a block needs before it is worth opening.
 * Expressed as a delta from `RB_HEADER` so the header stays the one source.
 */
export const RB_OPEN_SLACK = 13;

/** Below this, an `open` block is drawn compressed: there is nothing to spend. */
export const RB_OPEN_MIN = RB_HEADER + RB_OPEN_SLACK;

/** The four weights. One component draws all of them. */
export type RbWeight = "open" | "compressed" | "row" | "declined";

/**
 * Every fact the block can say, in the order it gives up saying them.
 *
 * The handoff names six of these with their heights — place 29, entry 28,
 * link 29, attachment 29, preview 60, note 20 — and this list keeps that
 * relative order exactly. The rows between them are the ones the prototype
 * draws that the handoff's table does not list: the alarm, the scheduler's
 * reason, the move mark, the project label and the reserve. They rank above
 * the entry because where you have to be and whether you are late change what
 * you do next more than how to start does.
 */
export type RbFactKind =
  | "tasks"
  | "place"
  | "risk"
  | "reason"
  | "moved"
  | "where"
  | "reserve"
  | "entry"
  | "link"
  | "attachment"
  | "preview"
  | "note";

export interface RbFactSpec {
  kind: RbFactKind;
  zone: RbZone;
  /** The height the fact costs, before the row gap. */
  h: number;
}

/** The ranked list. Index is rank; earlier is spent first. */
export const RB_FACTS: readonly RbFactSpec[] = Object.freeze([
  { kind: "tasks", zone: "task", h: 26 },
  { kind: "place", zone: "meta", h: 29 },
  { kind: "risk", zone: "line", h: 20 },
  { kind: "reason", zone: "line", h: 20 },
  { kind: "moved", zone: "line", h: 20 },
  { kind: "where", zone: "meta", h: 18 },
  { kind: "reserve", zone: "line", h: 20 },
  { kind: "entry", zone: "control", h: 28 },
  { kind: "link", zone: "meta", h: 29 },
  { kind: "attachment", zone: "meta", h: 29 },
  { kind: "preview", zone: "og", h: 60 },
  { kind: "note", zone: "line", h: 20 },
]);

const RB_FACT_BY_KIND: Readonly<Record<RbFactKind, RbFactSpec>> = Object.freeze(
  RB_FACTS.reduce(
    (acc, spec) => {
      acc[spec.kind] = spec;
      return acc;
    },
    {} as Record<RbFactKind, RbFactSpec>
  )
);

/** Where a fact sits in the collapse order. Lower is spent first. */
export function rbRank(kind: RbFactKind): number {
  return RB_FACTS.findIndex((spec) => spec.kind === kind);
}

/** What a fact costs, before its row gap. */
export function rbFactHeight(kind: RbFactKind): number {
  return RB_FACT_BY_KIND[kind].h;
}

/** Which stack a fact is drawn in. */
export function rbFactZone(kind: RbFactKind): RbZone {
  return RB_FACT_BY_KIND[kind].zone;
}

/** One fact the block actually has, ready to be spent. */
export interface RbFact {
  kind: RbFactKind;
  zone: RbZone;
  h: number;
  /** Stable within a render. Group tasks repeat one kind, so they are indexed. */
  key: string;
  /** Which group task this is, for `kind: "tasks"` only. */
  index?: number;
}

/**
 * A fact's datum can be in three states, and they are not the same silence.
 * See the header of `@/lib/needt/types` — `null` means the product does not
 * have the capability yet, and such a row is skipped without drawing a hole.
 */
export type RbCapability = "has" | "none" | "absent";

/**
 * Read a three-state field.
 *
 *   `null`                      the capability is not built — `"absent"`
 *   `undefined`, `""`, `[]`     the task genuinely has none — `"none"`
 *   anything else               `"has"`
 */
export function rbCapability(value: unknown): RbCapability {
  if (value === null) return "absent";
  if (value === undefined) return "none";
  if (value === "") return "none";
  if (Array.isArray(value) && value.length === 0) return "none";
  return "has";
}

/** What the budget needs to know about a block. Presentation-free. */
export interface RbFactSource {
  place?: string | null;
  risk?: string | null;
  reason?: string | null;
  moved?: string | null;
  where?: string | null;
  reserve?: unknown;
  entry?: string | null;
  link?: string | null;
  attachment?: string | null;
  preview?: unknown;
  note?: string | null;
  /** A group's tasks, which are the block rather than its payload. */
  tasks?: readonly unknown[] | null;
}

/**
 * The facts this block has, in rank order.
 *
 * Only `"has"` earns a row: neither a missing capability nor an empty one
 * draws anything, because the block has no affordance to offer for either.
 * The distinction still travels — `rbCapability` is exported so a surface that
 * does want to offer "add the first part" can tell the two apart.
 */
export function rbBudget(source: RbFactSource): RbFact[] {
  const out: RbFact[] = [];
  for (const spec of RB_FACTS) {
    if (spec.kind === "tasks") {
      const tasks = source.tasks;
      if (rbCapability(tasks) !== "has" || !Array.isArray(tasks)) continue;
      tasks.forEach((_, index) => {
        out.push({
          kind: "tasks",
          zone: spec.zone,
          h: spec.h,
          key: `t${index}`,
          index,
        });
      });
      continue;
    }
    const value = source[spec.kind as Exclude<RbFactKind, "tasks">];
    if (rbCapability(value) !== "has") continue;
    out.push({ kind: spec.kind, zone: spec.zone, h: spec.h, key: spec.kind });
  }
  return out;
}

/** What spending a height down the ranked list produced. */
export interface RbSpend {
  shown: RbFact[];
  /** Header plus every row taken, including gaps. `null` when nothing was rationed. */
  spent: number | null;
}

/**
 * Spend a height down the ranked list.
 *
 * `height == null` is the request to fit: the container takes what the facts
 * need, so every fact is shown. Otherwise a fact is taken only if the header,
 * everything already taken, this fact and its gap all fit inside the height.
 */
export function rbSpendHeight(
  facts: readonly RbFact[],
  height: number | null
): RbSpend {
  if (height == null) return { shown: [...facts], spent: null };
  let spent = RB_HEADER;
  const shown: RbFact[] = [];
  const opened = new Set<RbZone>();
  for (const fact of facts) {
    const cost = rbRowCost(fact.zone, opened.has(fact.zone), fact.h);
    if (spent + cost <= height) {
      shown.push(fact);
      spent += cost;
      opened.add(fact.zone);
    }
  }
  return { shown, spent };
}

/* ── Content by height ───────────────────────────────────────────────────── */

/**
 * What the HEADER says at a given height. The collapse budget rations the
 * payload; this ladder rations the header itself, which is all a block short
 * of `RB_OPEN_MIN` has left to give up.
 *
 *   `< 22px`   title only
 *   `22–40px`  title and time on one line, the time right-aligned at 11px
 *   `40–70px`  a title line, then a time line
 *   `> 70px`   plus one meta line — the project dot and the part counter
 */
export type RbHeightTier =
  | "title"
  | "title-time-inline"
  | "title-time-stacked"
  | "title-time-meta";

export function rbHeightTier(height: number | null): RbHeightTier {
  if (height == null) return "title-time-meta";
  if (height < 22) return "title";
  if (height < 40) return "title-time-inline";
  if (height <= 70) return "title-time-stacked";
  return "title-time-meta";
}

/* ── Content by width ────────────────────────────────────────────────────── */

/** The rail at rest, and the rail once the checkbox has left the flow. */
export const RB_RAIL = 3;
export const RB_RAIL_WIDE = 5;

/**
 * What a width takes away. The ladder is cumulative: each narrower step keeps
 * everything the wider one already dropped.
 *
 *   `< 120px`  no project dot
 *   `< 90px`   the checkbox leaves the flow and overlays on hover; the rail
 *              thickens from 3px to 5px
 *   `< 64px`   the cluster stops splitting — it becomes one chip that opens a
 *              popover in place
 */
export type RbWidthTier = "full" | "no-dot" | "no-checkbox" | "chip";

export function rbWidthTier(width: number | null): RbWidthTier {
  if (width == null) return "full";
  if (width < 64) return "chip";
  if (width < 90) return "no-checkbox";
  if (width < 120) return "no-dot";
  return "full";
}

export interface RbWidthPlan {
  tier: RbWidthTier;
  showProjectDot: boolean;
  /** False once the checkbox leaves the flow. */
  checkboxInFlow: boolean;
  /** True when the checkbox is drawn over the block on hover instead. */
  checkboxOnHover: boolean;
  rail: number;
  /** True when the whole cluster collapses to a single chip. */
  asChip: boolean;
}

export function rbWidthPlan(width: number | null): RbWidthPlan {
  const tier = rbWidthTier(width);
  const narrow = tier === "no-checkbox" || tier === "chip";
  return {
    tier,
    showProjectDot: tier === "full",
    checkboxInFlow: !narrow,
    checkboxOnHover: narrow,
    rail: narrow ? RB_RAIL_WIDE : RB_RAIL,
    asChip: tier === "chip",
  };
}

/* ── The whole plan ──────────────────────────────────────────────────────── */

export interface RbLayoutRequest {
  weight: RbWeight;
  /** `null` is the request to fit — the block is as tall as what it says. */
  height?: number | null;
  width?: number | null;
  /** The explicit form of the same request, for a caller that has a height. */
  fit?: boolean;
  source: RbFactSource;
}

export interface RbPlan {
  weight: RbWeight;
  /** True when the block takes the height its facts need. */
  fits: boolean;
  height: number | null;
  /** True when the payload is spent at all. */
  open: boolean;
  heightTier: RbHeightTier;
  width: RbWidthPlan;
  /** Every fact the block has, in rank order, whether or not it was afforded. */
  budget: RbFact[];
  /** The facts that fit. */
  shown: RbFact[];
  spent: number | null;
}

/** Everything the component needs to know before it draws anything. */
export function rbLayout(request: RbLayoutRequest): RbPlan {
  const { weight, source } = request;
  /* A null height IS the request to fit. Making `fit` a second way of saying
     the same thing is what let one call site say it and another forget, so the
     block derives it and no caller can get it wrong. */
  const fits = request.fit === true || request.height == null;
  const height = fits ? null : (request.height ?? null);
  const budget = rbBudget(source);
  /* Only the two block weights have a payload at all; a row has columns and a
     declined block has the slot, which is the whole fact. A block that fits
     opens whatever its weight, because there is nothing to ration. */
  const isBlock = weight === "open" || weight === "compressed";
  const open =
    isBlock && (fits || (weight === "open" && (height ?? 0) >= RB_OPEN_MIN));
  const spend = open
    ? rbSpendHeight(budget, height)
    : { shown: [] as RbFact[], spent: height == null ? null : RB_HEADER };
  return {
    weight,
    fits,
    height,
    open,
    heightTier: rbHeightTier(height),
    width: rbWidthPlan(request.width ?? null),
    budget,
    shown: spend.shown,
    spent: spend.spent,
  };
}

/** The facts of one zone, in rank order. */
export function rbZoneFacts(facts: readonly RbFact[], zone: RbZone): RbFact[] {
  return facts.filter((fact) => fact.zone === zone);
}
