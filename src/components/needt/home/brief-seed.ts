/* THE BRIEF'S OWN SEED — composition, not data.
 *
 * Ported from `Brief.jsx`'s `SEED` and `LOG`. A block's position on the
 * canvas is composition rather than data, the same reasoning `fixture.ts`
 * gives for why screens keep their own seed of blocks — so this stays local
 * to Home rather than joining `@/lib/needt/fixture`.
 */
import type { BriefObject } from "./brief-types";

export const BRIEF_SEED: readonly BriefObject[] = Object.freeze([
  {
    id: "o1",
    kind: "heading",
    author: "you",
    x: 40,
    y: 32,
    w: 460,
    text: "Week 36 — the September batch",
  },
  {
    id: "o2",
    kind: "text",
    author: "you",
    x: 40,
    y: 72,
    w: 460,
    text: "Legal sign-off is the only thing between us and the factory. Everything else can move.",
  },
  {
    id: "o4",
    kind: "text",
    author: "needt",
    x: 40,
    y: 148,
    w: 460,
    typed: true,
    text: "Three tasks are unplaced and 18 hours are open. Two of them fit before Thursday — say the word and I will place them.",
  },
  {
    id: "o5",
    kind: "checklist",
    author: "you",
    x: 40,
    y: 248,
    w: 300,
    items: [
      { label: "Ask counsel for a date", done: true },
      { label: "Send the print files", done: false },
      { label: "Confirm the courier", done: false },
    ],
  },
  {
    id: "o6",
    kind: "card",
    author: "linear",
    x: 40,
    y: 372,
    w: 300,
    title: "Print files to the factory",
    meta: "8–9 Sep · blocked",
    tone: "var(--info)",
  },
  {
    id: "o7",
    kind: "quote",
    author: "you",
    x: 40,
    y: 452,
    w: 380,
    text: "Density over comfort — whitespace that costs a visible row costs a scroll.",
    source: "Needt design rules",
  },
  {
    id: "m1",
    kind: "metric",
    author: "needt",
    x: 600,
    y: 32,
    w: 240,
    value: "18 h",
    caption: "free this week, Monday to Friday",
  },
  { id: "m2", kind: "image", author: "you", x: 600, y: 140, w: 268, h: 160 },
  {
    id: "m3",
    kind: "drawing",
    author: "you",
    x: 600,
    y: 328,
    w: 268,
    h: 130,
    path: "M20 100 C 60 24, 120 118, 168 60 S 230 20, 250 48",
  },
  {
    id: "m4",
    kind: "email",
    author: "github",
    x: 600,
    y: 484,
    w: 300,
    to: "anna@needt.app",
    subject: "Sign-off — where are we",
    body: "Short note: we need a date, not an answer.",
  },
]);

export const BRIEF_LOG: readonly (readonly [string, string])[] = Object.freeze([
  ["Legal came back: sign-off possible, no date yet", "Fri, 16:45"],
  ["Print files finished — waiting on the factory to confirm the run", "Thu, 11:20"],
  ["Courier quote in: two days cheaper than the old one", "Wed, 09:05"],
  ["Batch photographed, three items still unlisted", "Tue, 18:30"],
  ["Week planned: 18 free hours, 3 tasks unplaced", "Mon, 08:40"],
]);
