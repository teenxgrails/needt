/* THE KEYBOARD — one table, and the caps ARE the binding.
 *
 * PORT.md §5: one table drives both the handler and the printed sheet, because
 * a printed list that disagrees with the keys that fire is worse than no list.
 *
 * This goes one step further than the kit did. The kit's rows carried a
 * `keys` array for printing AND a `match` predicate for firing — two
 * descriptions of one binding, kept in step by hand. Here the caps are parsed
 * into the chord, so there is nothing to keep in step: change `["⌘", "⇧", "F"]`
 * to `["⌘", "⇧", "D"]` and the sheet and the handler move together or neither
 * moves.
 *
 * A row with `action: null` is printed and never fires here. Those bindings
 * belong to whatever holds the selection — the shell has no task in hand — and
 * the sheet is still where a person looks them up.
 *
 * Nothing in this file touches the DOM, so the whole table is testable.
 */
import type { NeedtScreenId } from "./screens";

/** What a key does. The shell switches on `kind`; nothing else reads it. */
export type NeedtKeyAction =
  | { kind: "palette" }
  | { kind: "new" }
  | { kind: "focus" }
  | { kind: "plan" }
  | { kind: "theme" }
  | { kind: "sheet" }
  | { kind: "close" }
  | { kind: "go"; screen: NeedtScreenId };

export interface NeedtKey {
  /** The caps, as printed — and as matched. */
  caps: readonly string[];
  label: string;
  /** `null` prints the row without binding it here. */
  action: NeedtKeyAction | null;
  /** A fact rather than an offer: printed in the muted ink. */
  quiet?: boolean;
}

export interface NeedtKeyGroup {
  title: string;
  keys: readonly NeedtKey[];
}

/* ── THE TABLE ──────────────────────────────────────────────────────────── */

export const NEEDT_KEYS: readonly NeedtKeyGroup[] = Object.freeze([
  {
    title: "Everywhere",
    keys: [
      { caps: ["⌘", "K"], label: "Open anything", action: { kind: "palette" } },
      {
        caps: ["⌘", "N"],
        label: "New — task, event, document",
        action: { kind: "new" },
      },
      {
        caps: ["⌘", "⇧", "F"],
        label: "Start or stop focus",
        action: { kind: "focus" },
      },
      { caps: ["⌘", "⇧", "P"], label: "Plan my day", action: { kind: "plan" } },
      { caps: ["?"], label: "This list", action: { kind: "sheet" } },
      {
        caps: ["esc"],
        label: "Close what is open",
        action: { kind: "close" },
        quiet: true,
      },
    ],
  },
  {
    title: "Go to",
    keys: [
      {
        caps: ["G", "H"],
        label: "Home",
        action: { kind: "go", screen: "today" },
      },
      {
        caps: ["G", "C"],
        label: "Calendar",
        action: { kind: "go", screen: "calendar" },
      },
      {
        caps: ["G", "W"],
        label: "Workspace",
        action: { kind: "go", screen: "workspace" },
      },
      {
        caps: ["G", "D"],
        label: "Documents",
        action: { kind: "go", screen: "docs" },
      },
      {
        caps: ["G", "S"],
        label: "Settings",
        action: { kind: "go", screen: "settings" },
      },
    ],
  },
  {
    /* Printed, not bound: these need a task in hand, and the shell has none.
       They stay in the one table so the sheet cannot forget them. */
    title: "On a task",
    keys: [
      { caps: ["⏎"], label: "Open it", action: null },
      { caps: ["⌘", "⏎"], label: "Close it", action: null },
      { caps: ["⌘", "⇧", "S"], label: "Reschedule", action: null },
      { caps: ["⌫"], label: "Delete it", action: null },
    ],
  },
  {
    title: "Theme",
    keys: [
      {
        caps: ["⌘", "⇧", "L"],
        label: "Cycle the theme",
        action: { kind: "theme" },
      },
    ],
  },
]);

/** Every row, flat, in the order the sheet prints them. */
export const NEEDT_KEY_ROWS: readonly NeedtKey[] = Object.freeze(
  NEEDT_KEYS.flatMap((group) => group.keys)
);

/* ── READING THE CAPS ───────────────────────────────────────────────────── */

const MODIFIER_CAPS: ReadonlySet<string> = new Set(["⌘", "⇧", "⌥"]);

/** The caps that are not a key: `"esc"` is what a person reads, not an event. */
const NAMED_CAPS: Readonly<Record<string, string>> = Object.freeze({
  esc: "escape",
  "⏎": "enter",
  "⌫": "backspace",
});

/** One key held with modifiers. `key` is already lowercased, as `event.key` is. */
export interface NeedtChord {
  key: string;
  /** ⌘ on a Mac, Ctrl elsewhere — one flag, because the table draws one cap. */
  meta: boolean;
  shift: boolean;
  alt: boolean;
}

/** A lead key, then a second one: `G` then `H`. */
export interface NeedtSequence {
  lead: string;
  then: string;
}

function isLetterCap(cap: string): boolean {
  return /^[A-Za-z]$/.test(cap);
}

/**
 * The sequence a row describes, or `null` when it is not one.
 *
 * Two bare letter caps and no modifier is a sequence — that is the only shape
 * the product uses, and reading it off the caps is what keeps `G`+letter out
 * of a second list.
 */
export function sequenceOf(key: NeedtKey): NeedtSequence | null {
  if (key.caps.length !== 2) return null;
  const [lead, then] = key.caps;
  if (!isLetterCap(lead) || !isLetterCap(then)) return null;
  return { lead: lead.toLowerCase(), then: then.toLowerCase() };
}

/**
 * The chord a row describes, or `null` when the caps are not one chord —
 * a sequence, or something with two non-modifier caps.
 */
export function chordOf(key: NeedtKey): NeedtChord | null {
  if (sequenceOf(key)) return null;
  const rest = key.caps.filter((cap) => !MODIFIER_CAPS.has(cap));
  if (rest.length !== 1) return null;
  const cap = rest[0];
  return {
    key: NAMED_CAPS[cap] ?? cap.toLowerCase(),
    meta: key.caps.includes("⌘"),
    shift: key.caps.includes("⇧"),
    alt: key.caps.includes("⌥"),
  };
}

/* ── MATCHING ───────────────────────────────────────────────────────────── */

/** What the matcher needs of a keyboard event; `KeyboardEvent` satisfies it. */
export interface NeedtKeyEvent {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

export interface NeedtMatchOptions {
  /** True when the caret is in a field: bare keys are text there. */
  typing?: boolean;
}

function chordMatches(chord: NeedtChord, event: NeedtKeyEvent): boolean {
  /* ⌘ and Ctrl are one cap, because the table prints one and a Windows user
     reading "⌘K" presses Ctrl. */
  if (chord.meta !== (event.metaKey || event.ctrlKey)) return false;
  if (chord.alt !== event.altKey) return false;
  if (event.key.toLowerCase() !== chord.key) return false;
  /* Shift is only decidable for a letter. On "?" the shift IS the question
     mark, and on Enter a shifted Enter is still Enter. */
  if (isLetterCap(chord.key) && chord.shift !== event.shiftKey) return false;
  return true;
}

/**
 * The row this event fires, or `null`.
 *
 * Inside a field only the modified rows fire, plus Escape: the rest of the
 * table is text there. A row with no action is skipped — it is printed, not
 * bound.
 */
export function matchNeedtKey(
  event: NeedtKeyEvent,
  options: NeedtMatchOptions = {}
): NeedtKey | null {
  for (const row of NEEDT_KEY_ROWS) {
    if (!row.action) continue;
    const chord = chordOf(row);
    if (!chord) continue;
    if (!chordMatches(chord, event)) continue;
    if (options.typing && !chord.meta && chord.key !== "escape") continue;
    return row;
  }
  return null;
}

/** Every letter that starts a sequence, read off the table. */
export const NEEDT_SEQUENCE_LEADS: ReadonlySet<string> = new Set(
  NEEDT_KEY_ROWS.map(sequenceOf)
    .filter((sequence): sequence is NeedtSequence => sequence !== null)
    .map((sequence) => sequence.lead)
);

/** How long a lead key stays live before it is just a letter again. */
export const NEEDT_SEQUENCE_MS = 1000;

/** The row `lead` then `then` fires, or `null`. */
export function matchNeedtSequence(
  lead: string,
  then: string
): NeedtKey | null {
  const wantLead = lead.toLowerCase();
  const wantThen = then.toLowerCase();
  for (const row of NEEDT_KEY_ROWS) {
    if (!row.action) continue;
    const sequence = sequenceOf(row);
    if (!sequence) continue;
    if (sequence.lead === wantLead && sequence.then === wantThen) return row;
  }
  return null;
}
