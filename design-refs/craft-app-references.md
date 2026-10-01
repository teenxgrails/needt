# Craft — application references

Fifteen screens of the Craft web app, reviewed 2026-08-23. Owner picked Craft
as a reference for the **application**, alongside Dia and Poke for the
marketing site (`design-refs/marketing-site-references.md`).

Craft overlaps Needt more than any other reference: it has documents, tasks, a
calendar, a whiteboard, MCP connections and a settings surface — the same
surface set Needt is building. So the useful output is not "the vibe" but a
list of solved problems, each marked **take / adapt / leave**.

---

## Solved problems worth taking

### Empty states live inside the sidebar, as italic hints — TAKE

Under `Starred`: *"Star Docs to keep them close."* Under `Tags`: *"Pin your key
tags for quick access."* Grey, italic, smaller than the section label.

This is the direct fix for the flaw visible in
`design-refs/prototypes/15-today-light.html`: a sidebar with four nav items and
three projects, then several hundred pixels of nothing. Craft never shows blank
sidebar space — every section either has content or explains what would go
there. It also teaches the feature without onboarding.

Matches what `ui-conventions.md` already asks for on Focus: *"When analytics are
empty, render one compact status line instead of empty tiles."* Same rule,
applied to navigation.

### The command bar is labelled with a verb — TAKE

Top centre, full-width-ish, reading `🔍 Open`. Not "Search", not a bare
magnifier. It names the outcome rather than the mechanism, and it is the single
most prominent control in the chrome.

Needt already ships `cmdk` and keeps commands in `src/lib/commands/`. This is a
label and placement change, not a build.

### Empty state = icon, one sentence, one action — TAKE

Tasks / Inbox with nothing in it: a small outline icon, *"Well done, all your
tasks are organized!"*, and a single `Add Task` button. No illustration, no
three-card grid of suggestions.

### Section headers are readable, not micro-caps — ADAPT

Craft uses `Starred`, `Folders`, `Tags` at roughly 13px semibold in near-black.
Needt's prototypes use 10.5px uppercase letter-spaced grey — a decorative
convention that costs legibility. Craft's is calmer *and* easier to read, which
is the whole claim of the direction.

### Tabbed inspector on the right — ADAPT for Pages

In the document view the right panel carries `Insert · Format · Style · Info`
as text tabs, with draggable blocks below (`Text`, `Page`, `Card`,
`File Attachment`, `Image`, `Code Block`, `Whiteboard`, `TeX Formula`,
`Collection`) each with a grip handle, plus `Insert Line`, `Insert Page Break`,
`Insert Table` with a hover-sized grid.

Relevant to Needt Pages (Tiptap 3). Worth taking: the four-tab split, and
insertables as a draggable palette rather than only a slash menu.

### Style Gallery — ADAPT for `/style`

A grid of named preset cards: `Original`, `Fire Horse`, `Fire Petals`,
`Prosperity Bloom`, `Lunar Ink`, `Soft Spring`, `Sunrise`, `Golden Hour`,
`Sunset`. Each is a miniature of the *result*, not a swatch. The right rail
carries `Backdrop`, `Document Color`, `Text Color`, `Cover Image`,
`Separator Style`, `Font`, and a `Wide Page` toggle.

This is what the Needt `/style` laboratory should look like once D3 lands, and
it matches a decision already written down: `design-refs/prototypes/README.md`
line 258 and `docs/plans/10-design.md` line 374 both specify a **124×76 preview
window per settings row showing the actual result in miniature**, not an icon.
Craft proves the same pattern one level up — a whole theme as one preview card.

### Reminders panel — ADAPT

Notifications split into `Activity` / `Reminders` tabs, an `IN PROGRESS`
section, overdue lines in red (*"Overdue since Today, 9:30 AM"*), a per-item
menu with `Mark as Resolved` / `Reschedule` / `Remove Reminder`, and
`Show Resolved Reminders` at the bottom.

Needt has reminders and a notification facade (`src/lib/notifications.ts`).
The three-verb menu is the part worth copying — it is exactly the set a
planner needs, and "Reschedule" belongs there rather than requiring a trip to
the task.

### Recurrence wording — ADAPT

The repeat submenu reads `Daily`, `Every Weekday (Mon–Fri)`,
`Weekly (Sundays)`, `Monthly (12.)`, `Yearly (April 12)`, `Custom…` — each
option carries the concrete consequence in parentheses. Needt reworked
recurrence in plan 01; the parenthetical is a cheap clarity win.

### Icon picker — ADAPT, later

A searchable grid of monochrome outline icons for folders. Needt's projects
carry a colour but no icon. Low priority, but it is the mechanism that makes a
long project list scannable.

---

## Where Needt is already ahead — LEAVE

### Settings

Craft's settings are a **modal** — left nav (`Space Settings`,
`General Settings`, account rows) and a right pane, floating over the app, with
`Danger Zone` in red at the bottom.

Needt's settings are already a **full page**: `src/app/(app)/settings/page.tsx`
with **31** panel components in `src/components/settings/`. The owner's note
"надо фулл скрин" is already satisfied — this is one point where copying Craft
would be a step back.

Worth taking from it anyway: the `Danger Zone` block at the bottom of the
relevant pane, with the destructive action described in one plain sentence
before the red control.

### Whiteboard

Craft's whiteboard panel — `Stroke`, `Background`, `Fill`, `Stroke width`,
`Stroke style`, `Sloppiness`, `Edges`, `Opacity`, `Layers` — is Excalidraw's
own UI. Needt already ships `@excalidraw/excalidraw ^0.18.1` for Moodboards,
so this comes for free and needs no design work.

---

## Two conflicts to decide

### 1. Document on a floating card, or one continuous canvas?

Craft floats the document as a white card with wide margins over a slightly
darker ground — a paper affordance that reads as premium and makes the
document feel like an object.

`ui-conventions.md` says the opposite: *"The app uses one continuous canvas
color per theme… Depth comes from the shared `--ambient-background`… never from
separate surface colours."* Confirmed as the standing decision on 2026-08-23
(`design-refs/design-decisions-2026-08-23.md` §1).

The two cannot both be true on the Pages screen. **Owner decision.** Note that
Craft's card only works because the ground behind it is a different value — the
same thing the one-canvas rule forbids.

### 2. Craft is colourful; the chosen direction is one accent

Bright blue primary buttons, a nine-colour picker for cards, coloured style
presets, coloured folder icons. Needt's direction is a single clay accent with
colour reserved for project identity.

Take Craft's *structure*, not its palette. The screens are worth studying with
the colour mentally removed.

---

## Backlog: Craft integration

Owner's idea, 2026-08-23 — integrate Craft into Needt later.

Feasible in principle: Craft's `Imagine` screen exposes **MCP connections**
("For AI tools to access your docs") and **API connections** ("For building
workflows and shortcuts") as first-class objects. Needt ships its own connector
API and MCP server (`docs/connector-api.md`, `mcp/README.md`), so the two can
meet as MCP peers rather than through a bespoke integration.

Not scheduled. Recorded so it is not lost, and so nobody builds a one-off
importer when an MCP bridge is the cheaper shape.

**Adjacent observation, not part of that idea:** the `Imagine` screen itself is
a pattern Needt lacks — connections presented as a browsable surface rather
than buried in settings. Needt's connectors currently live in
`src/components/settings/ConnectorSettings.tsx`.
