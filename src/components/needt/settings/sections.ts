/* THE SECTION REGISTRY — nine sections, and what a search for one matches.
 *
 * Pure data and one pure function, on purpose: `screens.ts` makes the same
 * choice for the same reason — a registry that carried glyph components
 * would drag `react-icons` into a test that only wants to know what
 * "appearance" means, and the sheet that draws the nav rail attaches the
 * glyph itself (see `SECTION_GLYPHS` in `SettingsScreen.tsx`).
 *
 * Ported from `SettingsScreen.jsx`'s `SECTIONS` + `KEYWORDS`: the kit kept
 * those as two parallel arrays/objects keyed by the same id, which is the
 * same "two descriptions of one thing" trap PORT.md §5 calls out for the
 * keyboard table. Here a section's keywords live on the section.
 */

export type SettingsSectionId =
  | "appearance"
  | "day"
  | "calendars"
  | "tasks"
  | "focus"
  | "alerts"
  | "keys"
  | "account"
  | "data";

export interface SettingsSection {
  id: SettingsSectionId;
  label: string;
  /** Extra words a search matches, beyond the label itself. Free text, not
   *  shown — the vocabulary a person would actually type. */
  keywords: string;
}

export const SETTINGS_SECTIONS: readonly SettingsSection[] = Object.freeze([
  {
    id: "appearance",
    label: "Appearance",
    keywords:
      "theme paper warm dim dark rail movability urgency density font document width drift",
  },
  {
    id: "day",
    label: "Your day",
    keywords:
      "working hours week start time zone scheduler auto-schedule protect focus min chunk buffer weekend",
  },
  {
    id: "calendars",
    label: "Calendars",
    keywords:
      "apple google sync declined all-day write back default view connect integrations booking",
  },
  {
    id: "tasks",
    label: "Tasks",
    keywords: "estimate project parts money groups impulse flame",
  },
  {
    id: "focus",
    label: "Focus",
    keywords: "session length break sound corner glow alerts wordmark snap",
  },
  {
    id: "alerts",
    label: "Alerts",
    keywords: "daily plan overdue week review channel desktop email",
  },
  {
    id: "keys",
    label: "Shortcuts",
    keywords: "shortcuts keyboard command palette",
  },
  {
    id: "account",
    label: "Account",
    keywords:
      "name email password plan sign out session workspace billing free pro lifetime trial delete account",
  },
  {
    id: "data",
    label: "Data",
    keywords:
      "export csv markdown json import archive api connector webhook ai provider key memory oauth",
  },
]);

/** The section a search matches: the label or its keywords, case-
 *  insensitively, substring rather than tokenised — the same rule the kit
 *  used, and simple enough that a person typing half a word still finds the
 *  section it belongs to. An empty or whitespace-only query returns every
 *  section, so clearing the field always restores the full list. */
export function filterSettingsSections(
  query: string,
  sections: readonly SettingsSection[] = SETTINGS_SECTIONS
): readonly SettingsSection[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return sections;
  return sections.filter((section) =>
    `${section.label} ${section.keywords}`.toLowerCase().includes(needle)
  );
}

/** The section, by id — a fallback to the first section when the id has
 *  gone stale (a search narrowed the list out from under a selection). */
export function settingsSection(
  id: SettingsSectionId,
  sections: readonly SettingsSection[] = SETTINGS_SECTIONS
): SettingsSection {
  return sections.find((s) => s.id === id) ?? sections[0];
}
