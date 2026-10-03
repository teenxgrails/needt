/* THE PALETTE'S OWN MATCH — pure, so it is testable without a DOM.
 *
 * The prototype's palette filtered with a bare `indexOf(query) > -1` and kept
 * whatever order the source array happened to have. That is a filter, not a
 * search: typing "brief" and getting the task whose title merely CONTAINS
 * "brief" ranked the same as one that STARTS with it, in array order rather
 * than relevance order.
 *
 * The rule here: a title that starts with the query outranks one that merely
 * contains it, and an exact match outranks a prefix. Ties keep the caller's
 * original order — `Array.prototype.sort` is stable, but the index is carried
 * through explicitly so that stability is not an implementation accident this
 * file depends on without saying so.
 */

/** Higher is more relevant. `null` means the query does not match at all. */
export function paletteScore(label: string, query: string): number | null {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const l = label.toLowerCase();
  const at = l.indexOf(q);
  if (at === -1) return null;
  if (at === 0) return l.length === q.length ? 3 : 2;
  return 1;
}

export interface PaletteHit<T> {
  item: T;
  score: number;
}

/**
 * Every item that matches `query`, ranked best first and capped at `limit`.
 *
 * `label` reads the searchable text off an item so this works for tasks,
 * documents and keyboard rows alike — one ranking, not one per surface.
 */
export function paletteMatch<T>(
  items: readonly T[],
  query: string,
  label: (item: T) => string,
  limit?: number
): T[] {
  const hits: { item: T; score: number; index: number }[] = [];
  items.forEach((item, index) => {
    const score = paletteScore(label(item), query);
    if (score !== null) hits.push({ item, score, index });
  });
  hits.sort((a, b) => b.score - a.score || a.index - b.index);
  const ranked = hits.map((hit) => hit.item);
  return typeof limit === "number" ? ranked.slice(0, limit) : ranked;
}
