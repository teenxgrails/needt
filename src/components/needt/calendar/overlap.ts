/* THE OVERLAP ALGORITHM — no DOM, provably right.
 *
 * Ported from the rule stated in `HANDOFF.md` (§ "The task object") rather
 * than from `CalendarScreen.jsx`'s `lanesOf` — that function only ever
 * produces an n-column split, so it cannot be the source for a rule that also
 * describes a cascade and a collapse-to-chip. PORT.md §10 says port the rule,
 * and the rule is prose; this is that prose as code.
 *
 * THE RULE, exactly:
 *   - Blocks that do not overlap (including two that merely touch at an
 *     endpoint): full width, always.
 *   - Two blocks whose overlap is under half of BOTH durations: cascade — the
 *     later one indents, keeps full width, draws above. Both halves of that
 *     AND must hold; testing only one duration was a real shipped bug.
 *   - Otherwise, n blocks that genuinely overlap: n columns, ordered by start
 *     then by duration descending. No cascade at 3+.
 *   - When a column split would land under 64px, the whole cluster collapses
 *     to one chip that opens a popover in place.
 *
 * A "cluster" here is a connected component of the overlap graph: if A
 * overlaps B and B overlaps C, all three are laid out together even where A
 * and C do not touch — the alternative is a column count that disagrees
 * between two blocks that are visibly stacked together.
 */

/** One thing to place on a day's timeline. `start`/`end` share one unit —
 *  hours-as-float and minutes-from-midnight both work, as long as every item
 *  in a call uses the same one. */
export interface OverlapItem {
  id: string;
  start: number;
  end: number;
}

export interface OverlapOpts {
  /** The column's own width in px. `null` (the default) skips the
   *  collapse-to-chip check — there is nothing to measure it against. */
  containerWidth?: number | null;
  /** Under this column width, the cluster collapses to one chip. */
  minColumnWidth?: number;
  /** The gap between adjacent columns, and the cascade's own indent unit. */
  gutter?: number;
}

const DEFAULT_MIN_COLUMN_WIDTH = 64;
const DEFAULT_GUTTER = 4;
/** The cascade's fixed indent, per HANDOFF.md. Not derived from the gutter —
 *  it is a stated design constant, not a multiple of one. */
export const CASCADE_INDENT_PX = 12;

export type OverlapSlot =
  | { kind: "full"; id: string; z: number }
  | { kind: "cascade"; id: string; indent: number; z: number }
  | { kind: "column"; id: string; lane: number; columns: number; z: number }
  | { kind: "chip"; ids: string[]; z: number };

/** Real overlap, strictly — two blocks that only share an endpoint do not
 *  overlap, so a 9–10 block and a 10–11 block both draw full width. */
export function intervalsOverlap(a: OverlapItem, b: OverlapItem): boolean {
  return a.start < b.end && b.start < a.end;
}

function duration(item: OverlapItem): number {
  return item.end - item.start;
}

/** Both halves of the AND must hold — the shipped bug tested only one. */
export function isCascade(a: OverlapItem, b: OverlapItem): boolean {
  const overlapAmount = Math.min(a.end, b.end) - Math.max(a.start, b.start);
  if (overlapAmount <= 0) return false;
  return overlapAmount < duration(a) / 2 && overlapAmount < duration(b) / 2;
}

/** Start ascending, then duration descending — the stated ordering for both
 *  the cascade's "later one" and the n-column split. */
function byStartThenDurationDesc(a: OverlapItem, b: OverlapItem): number {
  if (a.start !== b.start) return a.start - b.start;
  const durDiff = duration(b) - duration(a);
  if (durDiff !== 0) return durDiff;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Connected components of the overlap graph, in first-appearance order. */
export function buildOverlapClusters(
  items: readonly OverlapItem[]
): OverlapItem[][] {
  const clusters: OverlapItem[][] = [];
  const placed = new Set<string>();
  for (const seed of items) {
    if (placed.has(seed.id)) continue;
    const cluster: OverlapItem[] = [];
    let frontier = [seed];
    placed.add(seed.id);
    while (frontier.length) {
      const next: OverlapItem[] = [];
      for (const current of frontier) {
        cluster.push(current);
        for (const candidate of items) {
          if (placed.has(candidate.id)) continue;
          if (!intervalsOverlap(current, candidate)) continue;
          placed.add(candidate.id);
          next.push(candidate);
        }
      }
      frontier = next;
    }
    clusters.push(cluster);
  }
  return clusters;
}

/** Greedy interval colouring: the lowest lane not already taken by an
 *  overlapping neighbour already placed. `columns` is the lane count the
 *  greedy pass actually used, shared by the whole cluster. */
function assignColumns(cluster: readonly OverlapItem[]): {
  laneOf: Map<string, number>;
  columns: number;
} {
  const ordered = [...cluster].sort(byStartThenDurationDesc);
  const placed: { item: OverlapItem; lane: number }[] = [];
  const laneOf = new Map<string, number>();
  for (const item of ordered) {
    const used = new Set(
      placed
        .filter((p) => intervalsOverlap(p.item, item))
        .map((p) => p.lane)
    );
    let lane = 0;
    while (used.has(lane)) lane++;
    placed.push({ item, lane });
    laneOf.set(item.id, lane);
  }
  let columns = 1;
  for (const lane of laneOf.values()) columns = Math.max(columns, lane + 1);
  return { laneOf, columns };
}

/** One column's own pixel width, given the container and how many columns
 *  share it. Exported so a caller that already has a `"column"` slot and the
 *  container's width can compute the same number this module used to decide
 *  the collapse — rather than re-deriving the formula and risking the two
 *  drifting apart. */
export function columnPixelWidth(
  columns: number,
  containerWidth: number,
  gutter: number = DEFAULT_GUTTER
): number {
  return (containerWidth - gutter * (columns - 1)) / columns;
}

/**
 * Lay a day's (or a column's) items out.
 *
 * Pure: takes the intervals and the column's own width, returns what each one
 * gets. The caller turns a slot into pixels or percentages; this function
 * only ever decides cascade vs. column vs. chip.
 */
export function layoutOverlap(
  items: readonly OverlapItem[],
  opts: OverlapOpts = {}
): OverlapSlot[] {
  const {
    containerWidth = null,
    minColumnWidth = DEFAULT_MIN_COLUMN_WIDTH,
    gutter = DEFAULT_GUTTER,
  } = opts;
  const clusters = buildOverlapClusters(items);
  const slots: OverlapSlot[] = [];

  for (const cluster of clusters) {
    if (cluster.length === 1) {
      slots.push({ kind: "full", id: cluster[0].id, z: 0 });
      continue;
    }

    if (cluster.length === 2) {
      const [earlier, later] = [...cluster].sort(byStartThenDurationDesc);
      if (isCascade(earlier, later)) {
        slots.push({ kind: "full", id: earlier.id, z: 0 });
        slots.push({
          kind: "cascade",
          id: later.id,
          indent: CASCADE_INDENT_PX,
          z: 1,
        });
        continue;
      }
    }

    /* Two that genuinely overlap, or three-plus: n columns, no cascade. */
    const { laneOf, columns } = assignColumns(cluster);
    const colWidth =
      containerWidth != null
        ? columnPixelWidth(columns, containerWidth, gutter)
        : null;
    if (colWidth != null && colWidth < minColumnWidth) {
      slots.push({
        kind: "chip",
        ids: cluster.map((item) => item.id),
        z: 2,
      });
      continue;
    }
    for (const item of cluster) {
      const lane = laneOf.get(item.id) ?? 0;
      slots.push({ kind: "column", id: item.id, lane, columns, z: lane });
    }
  }

  return slots;
}

/** A slot's box, as CSS `left`/`width`. `null` for a chip — it has no single
 *  item's box, the caller draws the chip over the cluster's own bounds. */
export function overlapSlotBox(
  slot: OverlapSlot,
  gutter: number = DEFAULT_GUTTER
): { left: string; width: string } | null {
  switch (slot.kind) {
    case "full":
      return { left: "0px", width: "100%" };
    case "cascade":
      return {
        left: `${slot.indent}px`,
        width: `calc(100% - ${slot.indent}px)`,
      };
    case "column": {
      const leftPct = (slot.lane / slot.columns) * 100;
      const widthPct = (1 / slot.columns) * 100;
      return {
        left: `calc(${leftPct}% + ${gutter / 2}px)`,
        width: `calc(${widthPct}% - ${gutter}px)`,
      };
    }
    case "chip":
      return null;
  }
}
