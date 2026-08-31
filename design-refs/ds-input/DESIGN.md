---
name: Needt Design System
updated: 2026-08-31
source: Measured from Craft Docs (docs.craft.do) on 2026-08-31; structure from Craft Agents (Apache-2.0). Accent follows Craft (owner decision 2026-08-31). Third theme and display serif are Needt's own.
themes: light (default), dim, dark
colors:
  primary: "#2E6DE9"
  background: "#FCFDFE"
  surface: "#FFFFFF"
  border: "rgba(26, 28, 30, 0.08)"
  text-primary: "#1A1C1E"
  text-secondary: "rgba(26, 28, 30, 0.85)"
  text-muted: "rgba(26, 28, 30, 0.40)"
  info: "#ED990E"
  success: "#098926"
  destructive: "#E6000C"
typography:
  heading: "Inter, system-ui, -apple-system, sans-serif"
  body: "Inter, system-ui, -apple-system, sans-serif"
  display: "Instrument Serif, ui-serif, Georgia, serif"
  mono: "JetBrains Mono, ui-monospace, SFMono-Regular, monospace"
spacing:
  base: "4px"
  steps: "1, 2, 4, 5, 8, 16, 20"
radius:
  chip: "4px"
  control: "8px"
  button: "10px"
  input: "12px"
  card: "16px"
  container: "20px"
  sheet: "26px"
  pill: "9999px"
---

# Needt Design System

Needt is a single-user planner: calendar, tasks, projects, documents, focus. One
person opens the same four screens forty times a day. The interface is
instrument panel, not brochure.

## Visual Direction

Quiet, dense, monochrome. The entire grey ladder is generated from one text
colour at declining alpha — there are no separately authored greys. Depth comes
from a hairline ring, never from a coloured surface and never from a glow.
Colour appears in exactly three roles: category identity on task blocks,
state (overdue / done / warning), and selection. Nothing is coloured for
decoration.

Light is the default and carries the identity; dark and dim are swaps of the
same geometry.

## Color System

Every value below is one of six base colours or a derivation of one. Never
introduce a grey that is not on this ladder.

### Base — light (default)

| Token | Value | Usage |
|---|---|---|
| `--background` | `#FCFDFE` | canvas, sidebar — a step below white on purpose |
| `--surface-raised` | `#FFFFFF` | document sheet, card, popover |
| `--foreground` | `#1A1C1E` | all text and icons |
| `--accent` | `#2E6DE9` — `oklch(0.567 0.199 262)` | selection, focus, today, primary action |
| `--info` | `#ED990E` — `oklch(0.75 0.16 70)` | warning, attention |
| `--success` | `#098926` — `oklch(0.55 0.17 145)` | done, connected |
| `--destructive` | `#E6000C` — `oklch(0.58 0.24 28)` | error, overdue, destructive action |

Authored in OKLCH; the hexes are computed, not eyeballed. `--destructive` at
chroma 0.24 lands on a near-pure red that is louder than the rest of the
palette — drop chroma to ~0.19 if it shouts on the calendar.

### Base — dark / dim

| Token | dark | dim |
|---|---|---|
| `--background` | `#121314` | `#1E2021` |
| `--surface-raised` | `#1E1E1E` | `#292B2C` |
| `--foreground` | `#F9F9F9` | `#F9F9F9` |
| `--accent` | `#71B2FF` | `#71B2FF` |
| `--info` | `#DC8900` | `#DC8900` |
| `--success` | `#279936` | `#279936` |
| `--destructive` | `#FF6367` | `#FF6367` |

Dim is not a third palette. Only the ground moves; every derived value
recomputes from it.

### Text — one colour, five levels

| Token | Alpha | Usage |
|---|---|---|
| `--text-primary` | 100% | titles, active rows, values |
| `--text-secondary` | 85% | labels, nav rows at rest |
| `--text-tertiary` | 70% | supporting copy |
| `--text-quaternary` | 55% | metadata |
| `--text-muted` | 40% | inactive tabs, low-emphasis meta |
| `--text-disabled` | 25% | placeholders, empty-state copy |

### Fills — the same colour, six steps

| Token | Alpha | Usage |
|---|---|---|
| `--fill-1` | 2% | subtlest wash |
| `--fill-2` | 3% | menu row at rest |
| `--fill-3` | 4% | button at rest, inactive segment |
| `--fill-4` | 6% | nav row active |
| `--fill-5` | 8% | hairline, calendar day |
| `--fill-6` | 12% | pressed |

### Accent — translucent only

| Token | Value | Usage |
|---|---|---|
| `--fill-accent` | accent @ 12% | selected tab, accent chip — text is the solid accent |
| `--fill-accent-strong` | accent @ 24% | today in the calendar, and nothing else |
| `--ring-accent` | accent @ 40% | focus ring, 2px, **inset** |

There is no solid-accent button anywhere in this system. The accent is always a
translucent fill with the accent itself as the text colour.

## Typography

Inter for everything. Sans is the system stack with Inter first — Apple's
licence forbids shipping SF as a webfont, but `system-ui` resolves to real SF
on macOS at zero bytes.

| Role | Size / weight / line-height | Usage |
|---|---|---|
| Document | 16 / 400 / 19.2 | document body only |
| UI | 13 / 400 and 13 / 500 / 16 | every control, nav row, button, chip |
| Meta | 12 / 400 / 14.4 and 12 / 500 | metadata, counts, eyebrows |
| Card title | 15 / 600 / 18 | card and section titles |
| Page title | 22 / 600 | page heading |
| Document H1 | 24 / 700 / 29 | inside a document |

**There is no 14px in the chrome.** The interface lives at 13 and 12; 16 is
document text. If a value lands on 14, it is wrong.

`Instrument Serif` is permitted on display sizes only — 28px and up, tracking
`-0.02em`: the day number on Today, empty states, the sign-in screen. It is
Latin-only (374 glyphs, no Cyrillic), so never put it on a translatable string.

This reverses the 2026-08-23 decision "all sans in the application", by owner
decision on 2026-08-31. Small repeating headings stay sans.

## Spacing and Radius

Spacing steps: **1, 2, 4, 5, 8, 16, 20**. The odd steps are deliberate — do not
round 5 to 4 or 11 to 12.

Radius is assigned by object size, not globally:

| Radius | Object |
|---|---|
| 4px | inline chips, tiny controls |
| 8px | nav rows, icon buttons, tabs, chips — the workhorse |
| 10px | buttons, menu rows |
| 12px | the command bar, panels |
| 14px | avatar, space switcher |
| 16px | cards, calendar day |
| 20px | the calendar strip container |
| 26px | the document sheet — the largest in the product |
| 9999px | toggle groups, the floating action |

Control heights: **32px** standard (nav row, button, command bar), **28px**
compact (icon button, chip). Nothing else.

## Components

**Nav row.** 32px, radius 8, transparent at rest with text at 85%. Hover fills
`--fill-3`. Active fills `--fill-4` and promotes text to 100%. Never an
underline, never a left accent bar. Icon 20–24px plus a visible label, filled
icon variant when active; icon-only is allowed solely in a collapsed rail with
tooltips.

**Command bar.** Labelled with a verb — `Open`, not a magnifier. 32px, radius
12, transparent fill, **inset** ring `--border`. The ring goes inside; controls
are recessed, objects are raised.

**Button.** 32px, radius 10, fill `--fill-3`, text at 85%, 13/500. Hover
`--fill-4`, active `--fill-5`. Outline variant: transparent with the inset ring.
Icon button: 34×28, radius 8, fill `--fill-3`.

**Segmented control.** Selected segment takes `--fill-accent` with the solid
accent as text. Unselected sits on `--fill-3` with muted text.

**Card.** Radius 16, `--surface-raised`, ring `--border` at 1px, no resting
blur. The card reads because the ground behind it is a step darker.

**Document sheet.** Max width 844px, radius 26, white, ring only. A page of
writing behaves like a sheet of paper; the calendar canvas and the day timeline
never do.

**Calendar day.** Radius 16, padding 16, fill `--fill-5`. Today, and only
today, takes `--fill-accent-strong`. The strip container: radius 20, canvas
fill, inset ring at 4% plus a six-layer soft shadow.

**Calendar block.** The rail on a block means **movability**, not source: grey
rail = fixed, project-colour rail = the scheduler placed it and can move it
again. Explanation lives in one legend line under the canvas, never as a border
on every block. Block colour is the task's category; priority is rail
thickness (6px high, 4px normal); overdue overrides in red.

**Dialog.** 840×620, header 84px, aside column `minmax(320px, 356px)`, footer
54px. **One label column width and one row height for every field row.** Inner
rhythm: 6px inside a group, 11px under a sub-line, 21px between groups.

**Empty state.** An outline icon, one sentence at `--text-disabled`, one action.
In the sidebar, empty sections carry a grey italic hint at 12px instead of blank
space — never several hundred pixels of nothing.

**Floating action.** Radius 18, `backdrop-filter: saturate(1.5) blur(32px)`,
deep two-blur shadow plus ring. This is the **only** element in the product
permitted a backdrop blur.

**Focus.** 2px inset ring at `--ring-accent`. Never an outline offset, never a
glow.

## Layout Principles

Two-pane shell: a 268px sidebar rail beside a flexible main column. Page padding
20px, widening to 32px at large sizes. The header is fixed-height, the content
scrolls.

Density over comfort. This is a tool someone lives in; whitespace that costs a
visible row costs the user a scroll.

Scrollbars 8px, thumb `--border`, track transparent; inside a scrolling region
use the 4px variant that appears only on hover of the group.

Motion: two transitions and nothing else — 0.25s ease on background, border and
colour for the theme crossfade, 0.15s ease on shadow and border for hover. No
entrance animations, no stagger, no spring.

## Agent Instructions

Read this file before writing any UI in this repository.

1. **Never author a hex value.** Every colour is `--foreground` or `--accent` at
   an alpha from the ladders above. If you need a grey that is not on the
   ladder, you have made a mistake.
2. **Never use 14px in the chrome.** 13 and 12 only. 16 is document text.
3. **Every field row in a form shares one label-column width and one row
   height.** Before finishing a form, list the widths and heights you used and
   confirm they are one value each. Mixed widths are the single most common
   defect in this codebase.
4. **Radius comes from the table**, chosen by the object's size, not by taste.
5. Use the semantic tokens in `src/app/globals.css` and
   `design-refs/needt-tokens-v2.css`. Never hardcode.
6. Follow `design-refs/ui-conventions.md` for popovers, pickers, toggles and
   modals; `NeedtPicker` is the only picker.
7. When a rule here conflicts with an older note in `design-refs/`, this file
   wins and the older note should be edited, not silently violated.
8. Escape quotes and apostrophes in JSX as `&apos;` / `&quot;`.

## Don't

- **Don't add a solid-accent button.** Accent is always translucent fill plus
  accent text. A filled blue button does not exist in this system.
- **Don't use backdrop blur.** One exception exists — the floating action.
  Anywhere else, separate surfaces with a hairline and a ground shift.
- **Don't mark active state with an underline or a left bar.** Active is a fill
  plus a weight bump.
- **Don't stack meanings on the calendar rail.** It carries movability. Source,
  calendar identity and status must find another channel.
- **Don't put serif on small repeating headings.** Display sizes only, and never
  on a string that can be translated.
- **Don't leave blank sidebar space.** Every section either has content or an
  italic hint explaining what would go there.
- **Don't invent a component the system lacks.** If a dialog, select or toggle
  is missing, build it from the tokens here — do not import a look from another
  product.
