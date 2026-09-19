/* THE DOCUMENT LIST — a small, local fixture.
 *
 * Documents have no entry in `src/lib/needt/types.ts` yet (PORT.md §9: the
 * kit is honest that persistence does not exist). `id`/`title` for the two
 * pinned rows match `DesignPreview.tsx`'s own `PINNED` constant, so if this
 * screen and the sidebar are ever wired to the same store they already agree
 * on what a launch brief and the design rules are.
 */

export interface DocFixtureItem {
  id: string;
  title: string;
  /** Authored, not computed — see PORT.md §9 on seeded copy. */
  meta: string;
  /** Project name, or `null` for a document that belongs to none. */
  project: string | null;
  /** How many lines its miniature page draws. */
  lines: number;
  /** Pinned documents get the grid; everything else gets the list. */
  pinned?: boolean;
}

export const DOCS_FIXTURE: readonly DocFixtureItem[] = Object.freeze([
  {
    id: "launch",
    title: "Launch brief — September",
    meta: "Edited 20 min ago",
    project: "Operations",
    lines: 7,
    pinned: true,
  },
  {
    id: "rules",
    title: "Needt design rules",
    meta: "Edited yesterday",
    project: "Design system",
    lines: 9,
    pinned: true,
  },
  {
    id: "scheduler",
    title: "Scheduler — placement notes",
    meta: "Edited 3 days ago",
    project: "Design system",
    lines: 5,
  },
  {
    id: "review-35",
    title: "Weekly review, week 35",
    meta: "Edited 5 days ago",
    project: null,
    lines: 6,
  },
  {
    id: "german-b2",
    title: "German B2 — verbs to drill",
    meta: "Edited 1 week ago",
    project: "German",
    lines: 8,
  },
  {
    id: "invoices",
    title: "Invoices and receipts",
    meta: "Edited 2 weeks ago",
    project: "Operations",
    lines: 4,
  },
]);
