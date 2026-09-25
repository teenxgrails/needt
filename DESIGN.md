---
name: Needt Design System
updated: 2026-08-31
implementation: "Needt Design System/" — the built kit is the main reference. Tokens, components and the UI kit live there as code.
scope: This file holds only what code cannot hold — decisions, their dates, what they reversed, and the rules an agent must follow.
---

> **SUPERSEDED — 2026-09-11.** The design was replaced wholesale. The
> authority is now `needt-app/HANDOFF.md` inside the Claude Design project
> `Content height and label fixes` (`260768ff-eb30-4609-b2f7-d75b353033ed`),
> mirrored locally under `needt-app-design/` once the bundle is downloaded.
> See `docs/handoff/design-reconciliation-2026-09-11.md` for what changed.
> This file no longer decides anything. It is the record of how the product
> got here and why each earlier decision was taken.


# Needt Design System

**The kit is the system.** `Needt Design System/` holds the tokens, the
components and a clickable UI kit. Build against it, copy from it, read values
out of `tokens/`. Do not restate its numbers anywhere else — that duplication is
what produced four competing design systems before 2026-08-31.

This file exists for the one thing the kit cannot carry: **why**. A component
shows that a rail is grey or coloured. Only this file records that the colour
means *movability*, that the decision was taken on 2026-08-23, and what it
replaced.

Where the two disagree, fix the kit — it is the implementation, and an
implementation can be wrong. Where this file and any older note in
`design-refs/` disagree, this file wins and the older note gets edited.

## What the system is

A single-user planner: calendar, tasks, projects, documents, focus. One person
opens the same four screens forty times a day, so the interface is an instrument
panel, not a brochure — quiet, dense, monochrome.

Measured 2026-08-31 from the signed-in Craft Docs app; the token mechanism
(six base colours, alpha ladders, ring-first elevation, the z-index scale) comes
from Craft Agents, Apache-2.0. Light is the default; dark and dim are swaps of
the same geometry.

## Decisions, with dates

**Accent is Craft blue** `#2E6DE9` light / `#71B2FF` dark — owner, 2026-08-31.
Retires the clay `#C96442` of `docs/plans/10-design.md` and overrides the note in
`craft-app-references.md` that said to take Craft's structure but not its
palette. Contrast checked: 4.6:1 on the light canvas, 8.4:1 on dark. The landing
page stays green and lime — app and marketing run different accents on purpose.

**Serif is allowed in the app at display sizes** — owner, 2026-08-31. This
reverses decision §3 of 2026-08-23, which banned serif everywhere in the
product. 28px and up: the day number on Today, empty states, sign-in. Small
repeating headings stay sans.

**The display serif is 205TF Exposure, not Instrument Serif** — owner,
2026-09-06. One axis, `EXPO`, −100 to +100, default 0, and the metrics are
duplexed: every axis position has the same advance width, measured across all
eleven positions. Nothing in a layout can move when the axis animates, so no
width lock is needed anywhere.

Still Latin-only — 119 glyphs in the trial, no Cyrillic — so the old rule holds:
**serif never carries a translatable string.** This is currently violated. The
Canvas header sets "1 September · Tuesday · week 36" in the display serif, and
the month and weekday names are translatable; the account menu already offers a
Language item. Either those two strings move to sans or the header renders the
numeral in serif and the words in sans. Fix before localisation, not after.

⚠️ The file in `design-refs/fonts/` is a **trial**: testing only, no commercial
use, no redistribution. That folder must stay out of git and out of any deploy.
Buy the web licence from 205TF before the wordmark ships.

**SF cannot ship as a webfont.** Apple's licence forbids embedding it. The sans
stack puts Inter first and falls through to `system-ui`, which resolves to real
SF on macOS at zero bytes.

**The rail on a calendar block means movability, not source** — owner,
2026-08-23. Grey rail: fixed, you cannot move it. Project-colour rail: the
scheduler placed it and can move it again. This deliberately drops the older
convention that coded the rail by source. Two meanings on one rail are
unreadable, and movability is the message no competitor communicates. The
explanation lives in one legend line under the canvas, never as a border on
every block.

**Amended 2026-09-06: the rail meaning is a user setting, not a fixed decision.**
Settings → Appearance ships **Rail language: Movability | Urgency**, which was
built without being recorded here. The 2026-08-23 reasoning still holds and is
what makes the setting safe — only one meaning is ever live at a time. Two
consequences: the legend line must change with the setting, and no document may
state "grey is fixed" as a fact, because it is false for anyone on Urgency.
Movability stays the default.

**The document floats, the chrome does not** — owner, 2026-08-23, amended the
same day after reviewing Craft. A page of writing sits as a card on a slightly
darker ground. The calendar canvas, the day timeline and the sidebar do not.

**Sidebar navigation is icon plus visible label.** Never hover-only. Filled icon
variant for the active item; icon-only is permitted solely in a collapsed rail
with tooltips. This is the opposite of the marketing site, which is text-only,
and the difference is deliberate: a landing page is read once, a sidebar is used
daily.

**Motion is functional or it does not ship** — this survives. Everything else in
the old motion rule does not.

**The two-transition limit is lifted** — owner, 2026-09-06. It said "two
transitions and no more, the theme crossfade and hover" and "no entrance
animations". Both are reversed. Motion is now judged per surface, not by a
count. What replaces the count:

- Motion must be **caused**. It reports a real event — a mount, a state change,
  the pointer, the scheduler writing. Motion on a timer with no cause is still
  banned everywhere except the wordmark, which is the one licensed exception
  below.
- **The wordmark is the licensed exception.** `ExposureWordmark` carries five
  modes: develop-in on mount, breathe (an infinite loop), pulse (a 6s interval),
  torch (pointer-driven), busy (bound to the scheduler). It is one component in
  one place, and the loop is the point of it. Do not read this as permission for
  ambient motion anywhere else.
- Every mode pauses offscreen, pauses on a hidden tab, and is fully disabled
  under `prefers-reduced-motion` with a defined static resting state.

**The schedule re-flow no longer holds the animation budget** — same date. There
is no single budget any more. `design-refs/wow-animations-brief.md:16` still
claims there is; that line is dead, its libraries, springs and timings stand.

## Rules an agent must follow

1. **Never author a hex or a grey.** Every neutral is the foreground colour at
   an alpha from the ladder in `tokens/colors.css`. A hand-picked grey will be
   wrong in one of the three themes and nobody will notice for a month.
2. **Every derived token is declared in `:root`, `.dark` and `.dim`.** A custom
   property whose value contains `var()` is substituted where it is *declared*,
   then inherits as a resolved string. Declare it once on `:root` and the dark
   theme silently comes out light-grey. Nothing errors. This bug has already
   shipped twice in this project.
3. **No 14px in the chrome.** The interface runs at 13 and 12; 16 is document
   body text. If a value lands on 14, it is wrong.
4. **The accent is never a solid fill on a button.** It appears as a translucent
   fill at 12% or 24% with the accent itself as the text colour. Solid accent is
   permitted only on marks: the switch knob, the radio centre, a status dot, the
   now-line.
5. **One label-column width and one row height for every form row.** They are
   `--form-label-w` and `--form-row-h`, and `FormRow` exposes no prop to
   override them — the ability was removed rather than the practice forbidden.
   A label that wraps to two lines is the defect this system exists to remove.
6. **Backdrop blur appears exactly once**, on the floating action. Separate
   surfaces with a ground shift and a hairline instead. This line is the only
   authority on blur. Four other files disagree with it and with each other —
   `ui-conventions.md:45` and `docs/plans/09-launch.md:403` say the ban is
   retired, `wow-animations-brief.md:28` and `docs/plans/03-motion-ui.md:14` say
   blur is forbidden. All four are superseded on this point. The ban being
   "lifted" was about permission; this rule is about consistency, and the
   product uses blur in exactly one place.
7. **Radius is chosen by the object's size**, from the scale in
   `tokens/radius.css`, not by taste.
8. Escape quotes and apostrophes in JSX as `&apos;` / `&quot;`.

## Don't

- Don't add a solid-accent button. If the hierarchy feels flat, the problem is
  the hierarchy, not the saturation.
- Don't mark an active state with an underline or a left bar. Active is a fill
  plus a weight bump.
- Don't stack a second meaning onto the calendar rail.
- Don't put serif on small repeating headings, or on anything translatable.
- Don't leave blank sidebar space — every section has content or an italic hint
  saying what would go there.
- Don't invent a component the kit lacks. Build it from the tokens, or add it to
  the kit; do not import a look from another product.

## Superseded

`design-refs/app-design-system.md`, `design-refs/board-tokens.md`,
`design-refs/ui-conventions.md` (subordinate — component behaviour only), and
the Figma Make kit archived to `_archive-figma-make/`. `motion-ui-spec.md` and
`wow-animations-brief.md` keep their timings and layout teardowns; their glass
and glow are dead.
