/* THE PLACES — the product's screens, as one list.
 *
 * Pure data on purpose: the keyboard table needs the screen ids to name a
 * jump, and the keyboard table is tested without a DOM. A registry that
 * carried its own glyph components would drag `react-icons` into that test and
 * into anything else that only wants to know what "workspace" means.
 *
 * The glyph belongs with the thing that draws it, so it lives in `TabRail`.
 */

/** Everywhere the shell can be. `settings` is a place you go to, not a tab. */
export type NeedtScreenId =
  | "today"
  | "workspace"
  | "calendar"
  | "docs"
  | "settings";

export interface NeedtScreen {
  id: NeedtScreenId;
  /** What the screen calls itself once you are on it. */
  title: string;
  /** What the tab rail calls it. The same word unless the rail has no room. */
  tab: string;
  /** One line, stated in the empty frame, so a frame is never a blank box. */
  blurb: string;
}

export const NEEDT_SCREENS: readonly NeedtScreen[] = Object.freeze([
  {
    id: "today",
    title: "Home",
    tab: "Home",
    blurb:
      "Today, the week's brief, or the canvas — the habit rail first, then the day cut into morning, afternoon and evening.",
  },
  {
    id: "workspace",
    title: "Workspace",
    tab: "Workspace",
    blurb:
      "List, Kanban, Flow and Team. Flow is the one that answers what is stuck and why.",
  },
  {
    id: "calendar",
    title: "Calendar",
    tab: "Calendar",
    blurb:
      "Day, Week, Month, Columns and Sequence. 46px to the hour, all 24 of them, non-working hours hatched.",
  },
  {
    id: "docs",
    title: "Documents",
    tab: "Documents",
    blurb: "Written things, and the pinned ones that sit in the rail.",
  },
  {
    id: "settings",
    title: "Settings",
    tab: "Settings",
    blurb:
      "Nine sections with search, and the theme picker with live miniatures. It takes the whole window — the rail would only offer ways to leave it.",
  },
]);

/* Settings is reached from the account row and from G S, never from the rail:
   it is a place you go to rather than a screen you work beside. */
export const NEEDT_TAB_IDS: readonly NeedtScreenId[] = Object.freeze([
  "today",
  "workspace",
  "calendar",
  "docs",
]);

const BY_ID = new Map(NEEDT_SCREENS.map((screen) => [screen.id, screen]));

/** The screen, by id. Every id in the union is in the list, so this is total. */
export function needtScreen(id: NeedtScreenId): NeedtScreen {
  const found = BY_ID.get(id);
  /* Not reachable through the type, but a thrown error beats a blank frame if
     someone widens the union and forgets the row. */
  if (!found) throw new Error(`No such screen: ${id}`);
  return found;
}
