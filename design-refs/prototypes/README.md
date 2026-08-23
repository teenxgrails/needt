# Design prototypes — reference values

Concepts reviewed and approved by the owner on 2026-08-22, recorded as exact
values so they can be reproduced rather than re-invented. Narrative rationale
lives in [`docs/plans/10-design.md`](../../docs/plans/10-design.md); this file is
the implementation reference.

All of it is built on **Motion 12**, already in `package.json`. Do not add
another animation dependency.

---

## Shared motion values

```
press-in        90ms   cubic-bezier(.4, 0, .2, 1)     scale(.98)
press-release   340ms  cubic-bezier(.34, 1.4, .5, 1)  scale(1)     overshoot OK
reposition      460–520ms  cubic-bezier(.22, 1, .32, 1)  no overshoot
stagger          45ms between reflowed blocks
popover         160ms  translateY(4px)→0, scale(.98)→1, origin = trigger
sidebar width   320ms  cubic-bezier(.22, 1, .32, 1)
sidebar labels  140ms  opacity — deliberately faster than the width
nav indicator   320–340ms  cubic-bezier(.22, 1, .32, 1)
```

Overshoot is allowed **only** on button release — a rare, deliberate action.
Never on schedule blocks or list items, where it becomes irritating on repeat.

---

## Palette — warm charcoal (recommended)

```
bg      #17150F     canvas
panel   #211E17     event block, raised surface
line    #332E24     hairline border
text    #EDE7DA     primary
dim     #9A9184     secondary / muted
accent  #C96442     clay
acc-bg  #2A1F19     accent tint fill
now     #D8734F     current-time line only
```

Alternatives shown and rejected-for-now: light sand `#F5F2EA` with deep green
`#2F6B4F`; deep ink `#0E1214` with teal `#3FA89A`. Whichever is chosen, the
violet accent goes and the neutral ramp moves off pure gray.

---

## 1. Schedule reflow — the signature moment

Only genuinely moved blocks animate; unmoved blocks stay perfectly still.
Stagger 45ms, ~500ms traversal, decelerating. Explanation names the cause
("Moved 1 task to free 14:00 for *Design review*"), with undo beside it. Under
reduced motion positions update instantly and the explanation stays.

In production this is Motion's `layout` prop driven by real `TimeSlotManager`
output — not hand-computed positions.

## 2. Calendar blocks — variant B approved

Scheduled tasks and calendar events must be distinguishable at a glance:

```
task   background: transparent;  border: 1px dashed var(--color-accent);  radius 4px
event  background: panel;  border: .5px solid line;  border-left: 2px solid dim
```

The dash encodes mobility: a task can move, an event is fixed. The user learns
what is draggable before trying, and the reflow stops being surprising.

Rules that apply to both:

- Blocks under ~20px tall use a single-line variant — title and duration on one
  row, never clipped two-line text.
- Overlap splits width 42/58, never stacks.
- All times use `font-variant-numeric: tabular-nums`.
- Past blocks at 45% opacity.
- The current-time line is the only warm line on the screen: 1px `#D8734F`
  plus a 6px dot at the gutter.

**Open risk:** dashed borders may fragment visually on a heavily booked day.
Verify against a full day before committing.

## 3. Sidebar — new structure

The mini-month calendar is **removed** from the sidebar. Date and range
navigation belong to the canvas that owns time. This is the highest-signal
single change in the redesign.

Structure, top to bottom:

1. Window-controls strip, 36px. macOS puts the controls on the **left**, over
   the sidebar — reserve with `env(titlebar-area-x)` / `env(titlebar-area-height)`,
   mark the strip `-webkit-app-region: drag` and its controls `no-drag`.
   Wordmark sits after the inset.
2. One filled primary action, 34px, with its keyboard shortcut inside it.
3. Four places: День · Работа · Входящие · Документы. One shared indicator
   slides between them (`layoutId`) — never a highlight that fades out and in.
4. Projects as coloured 7px squares. Colour encodes the project permanently.
5. Focus as a **mode** control, visually distinct from the places above it.
6. Account row.

Collapsed state: width animates 320ms while labels fade at 140ms. Synchronous
timing crushes the text against the edge.

Hover affects only the hovered row — no movement, no scale, contrast only.

## 4. Merged Day/Week canvas

Today and Calendar become one surface with a range switch. What makes the merge
honest rather than two screens behind a toggle:

- **The date strip has two roles.** In Day it is the date navigator (seven days,
  current one filled); in Week it becomes the column headers of the grid. One
  component, two jobs — and it is precisely what makes the sidebar mini-calendar
  unnecessary, since its function now lives on the surface that owns time.
- **The right panel is the writable day agenda** — see section 7. It persists in
  both Day and Week; in Week it shows the agenda of the selected day. Earlier
  drafts collapsed it in Week, which was correct while it was only a note and is
  wrong now that it is a primary surface.
- The panel also repeats **Needs a slot** from Workspace, so the day surface
  shows both what is planned and what did not fit.
- The hour gutter stays fixed in both modes. It is the anchor the eye holds on to
  across the switch.
- The current-time line persists across both modes.

Route consequence: `/today` and `/calendar` collapse into one route with a range
parameter; both old paths redirect. Ship as its own release.

## 5. Workspace — a lens over the schedule, not a list

All product copy is **English**. Concepts must use English labels.

The distinguishing decision: **rows are ordered by when they are scheduled, not
by priority or manual rank.** Todoist and Motion sort by importance because they
do not own the schedule. Needt does, so a second ordering system is redundant.

- Groups: Now · Later today · Tomorrow · **Needs a slot**.
- Each row carries the same left marker as the calendar — 1px dashed accent for
  a Needt-scheduled task, 2px solid dim for a fixed event. The language transfers
  between surfaces and is learned once.
- **"Needs a slot" is the only true list**, and it is a problem statement rather
  than a backlog: work the scheduler could not place. It is the only
  accent-coloured group, and its rows show a `Place` action where a time would
  be. This is where the product gets a voice — it does not merely store tasks, it
  says where the day does not add up.
- A capacity bar at the top ties the list back to the scheduler (planned vs free)
  so the user sees a full day before adding to it.
- Row hover: background change only, no movement.

## 6. Inbox

Mail reframed. A pinned person is **a filter over existing mail**, not a
conversation system — no messaging, no moderation duty, nothing new in the schema
beyond a list of addresses.

- Pinned people rail on the left; selecting one filters the list to
  correspondence with that address.
- The person header shows **schedule context**: the next shared commitment
  ("Design review · Tue 14:00") or its absence, with a Book time action. This is
  what a mail client structurally cannot do — it has no access to the schedule.
  It is the single reason this belongs inside Needt.
- A `Schedule` action appears on row hover, dashed in the accent colour — the
  same language as the calendar and Workspace. Mail becomes a **scheduled block**,
  not a row in a list, and the dash tells the user in advance that it can move.
- Hover affects only the hovered row; the action appears only there.
- Unread is a 5px accent dot, not bold text.

## 7. Day agenda panel — owner decisions, 2026-08-22

The writable day agenda already exists in code: `daily-agenda-autosave.ts`,
`TaskReference.tsx`, `TaskGroupReference.tsx`, `TodayView.tsx` — 21 files with
tests. Moving it into the canvas panel is a relocation, not a build.

**Framing:** not "an AI agenda like Motion's". The frame is *the day is text, and
the scheduler executes what you wrote* — you write in prose, Needt places it in
time and tells you what did not fit. That is an entry point into something Needt
has and competitors do not, rather than a copied feature.

Two decisions, both approved:

1. **Truth lives in the database; the text is a projection.** Deleting a line
   archives the task (never physically deletes it, per S2); when the scheduler
   moves a task, the line updates itself. Without this rule the two
   representations drift — the existing "collapse duplicate inline task
   references" fix is already a symptom of that class of bug.
2. **The panel stays in Week view**, showing the agenda of the *selected day*
   rather than the week. It no longer collapses, because it is now a primary
   surface rather than a note.

## 8. Focus — a mode, not a screen

Entering Focus must not be a route change. The current block **is the same
element**, grown in place via a shared-element transition (`layoutId`). Nothing
is replaced, so the user has not gone anywhere — they have moved closer to what
they are already standing on.

- Current block: 460ms `cubic-bezier(.22, 1, .32, 1)` to a centred, larger box.
  Its dashed border becomes **solid** — the task is no longer movable because the
  user committed to it. Semantic, not decorative.
- The rest of the day drops to ~7% opacity rather than disappearing. The shape of
  the day stays in peripheral vision with nothing legible in it.
- The hour grid fades out. In Focus, time stops being a ruler and becomes one
  number.
- Exactly one thing remains readable: the timer.
- The header bar fades; a quiet HUD shows what is next plus one exit control.
- Under reduced motion the same end state applies instantly.

## 9. Primary action button

```
background: accent;  color: #1A0F0A;  border: none;  radius 8px
top edge:   1px rgba(255,255,255,.28)   ← reads as volume, not glow
```

Exactly **one** filled action per screen; everything else outline or ghost.
Scarcity is the mechanism — three filled buttons and none feel worth pressing.
No outer glow, no gradient fill.

The reward matters more than the control: creating a task must visibly send it
to the slot the scheduler chose.

## 10. Settings toggles with live preview

124×76 preview window per row showing the actual result in miniature — a slice
of real UI, never an icon. Reacts immediately on toggle. Animated previews run
**only on row hover** and stop on leave. Frozen under reduced motion, still
showing the changed end state. Rows with no meaningful miniature get no preview
box rather than decoration.

---

## Reproducing these

These prototypes were built as throwaway HTML in a design session. The values
above are the deliverable — rebuild against real components in `/style` rather
than porting prototype markup, which used hardcoded colours by necessity.

Everything in production goes through `src/lib/motion.ts` and `MotionRuntime`,
so OS, user and hidden-tab reduced-motion settings still disable it.
