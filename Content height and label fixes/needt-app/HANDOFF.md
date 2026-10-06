# Handoff: Needt — the whole product

## Overview

Needt is a single-user desktop planner: calendar, tasks, projects, documents,
habits and a focus mode in one app. Tasks and calendar events live on the same
grid, and a scheduler places work into the hours that are actually free.

This bundle is the complete design: six desktop screens, a phone shell, sign-in
and setup, and every state each of them has. It is the recreation the real
product is meant to be built from.

## About the design files

**The files in this bundle are design references written in HTML and JSX.**
They are prototypes of intended look and behaviour — not production code to
copy into the app. The task is to **recreate these designs in the target
codebase** (Next.js + React + Tailwind, per the design system's own note) using
its established patterns, data layer and routing. Where the codebase already
has a component that does a job, use it and style it to match; do not port the
prototype's markup verbatim.

Two specific things the prototypes do that production must not:

- **Every component is a global** (`window.TaskRow = …`), because the kit loads
  as classic `<script type="text/babel">` tags with no bundler. In production
  these are ordinary modules with `export`.
- **All state is local `useState` seeded from `Data.js`.** There is no
  persistence, no server, no optimistic update. `Data.js` is a fixture, not a
  schema — though its *shape* is the contract (see **Data model**).

## Fidelity

**High fidelity.** Colours, type, spacing, radii, shadows, motion durations and
easing curves are final and measured. Recreate them exactly. Where a value here
disagrees with the bound design system (`_ds/needt-design-system-main-…`), the
design system wins — everything below is either quoted from it or is a new
decision recorded here with its reason.

---

## The rules that outrank everything

Ported from the design system, plus four this project added. A change that
breaks one of these is a change of direction, not a refinement.

1. **Every grey is one text colour at an alpha from the ladder.** Text 100 / 85
   / 70 / 55 / 40 / 25. Fills 2 / 3 / 4 / 6 / 8 / 12. Never author a new grey.
2. **The chrome type scale is 13px and 12px only.** 16px is document body.
   There is no 14px in the chrome.
3. **The accent is never a solid fill on a button or a surface.** It appears as
   a translucent fill at 12% or 24% with the accent itself as the text colour.
   Solid accent is correct on a *mark* — a switch knob, a status dot, the
   now-line. Marks are not surfaces.
4. **One form-row geometry.** `--form-label-w: 105px`, `--form-row-h: 32px`. A
   label that does not fit truncates with an ellipsis and carries its full text
   in `title`; it never wraps. **If a label needs more than 105px, shorten the
   label.** Widening the column re-opens the defect the measurement exists to
   close.

Added by this project:

5. **One fact has one home.** `Data.js` owns the date, the projects, the
   calendars, the people, the habits and the tasks. Four separate project
   registries and a date typed into six files produced two real defects — a
   month that disagreed with its own week about which day 1 September was, and
   a habit wearing Operations' orange because a missing project fell back to
   `"ops"`. Neither was a rendering bug; both were two copies of one fact.
6. **Colour has one carrier per surface.** On a block: the **tile** and the
   **edge**. The body is `--surface-raised`. A project owns a hue, so the
   colour on screen is the user's own data rather than a palette decision. An
   event has no project, so its **calendar** owns its hue.
7. **The edge carries movability.** A fixed block wears a 1.5px hairline in its
   hue; a movable one wears 1px at a lower alpha. Readable at every block
   height and it costs no room. Status never rides this edge — status is a 6px
   dot.
8. **An entry animation holds no state.** Never `animation-fill-mode: both` on
   a broad selector: it makes the entry a permanent style, so an element that
   never got to run (mounted inside a clipped, parked subtree) freezes on the
   0% keyframe — invisible forever — and the filled animation outranks the
   hover and press transforms in the same layer.

---

## Screens

### 1 · Home (`TodayScreen.jsx` + `HomeToday.jsx` + `Brief.jsx`)

The first screen. Three forms, chosen in a popover behind the gear left of
**Plan my day**; the choice is shown as three miniatures, not three names.

| Form | What it is |
| --- | --- |
| **Today** (default) | The habit rail across the top, then the day's tasks cut into Morning / Afternoon / Evening, with **Overdue** and **Tomorrow** as walls at the left and right edges. |
| **Prose** | The week's brief as a written page: editable in place, `/` opens a block menu at the caret, selecting text raises a mark bar. |
| **Canvas** | The same brief as a free field of positioned objects — eight kinds, each carrying its author's ink. |

**The walls.** Overdue and Tomorrow are parked 248px off each edge, at
`opacity: 0.26`, under a diffuse darkening that pours in from the edge and off
the corners: you can see something is stacked out there but cannot read it.
Reaching the 22px lip slides the shelf in **over** the day — the thing you are
reading must not move while you look somewhere else. Only the lip and the
extended body take the pointer; the wall itself is `pointer-events: none`, or
it becomes a transparent shield across a third of the screen. The containing
block must be `overflow: clip` — a `transform` does not remove an element from
an ancestor's scrollable overflow.

**The habit rail.** Field of 14 squares first, chips under it: the squares are
the record, the chips are the controls. Measure is **kept days out of the last
14** ("10 of 14"), never a streak — a streak punishes one miss with total loss,
which is why people abandon them. A miss leaves an empty square and does
nothing else.

### 2 · Calendar (`CalendarScreen.jsx`, `ColumnsScreen.jsx`, `ColumnsView.jsx`)

Three views: **Columns** (default), **Week**, **Month**.

- **Columns** — seven days side by side, each a scrolling stack of task cards.
  Sortable: by AI, by time, by priority. Horizontal wheel and drag-to-pan;
  `scroll-snap-type: x proximity`. Columns for Overdue and No date pin at the
  left.
- **Week** — the hour grid. **46px per hour**, working hours 09:00–18:00 with
  "Show the whole day" expanding to 00:00–24:00. Hour gutter **68px**; the
  hours sit on a dotted rail running down the middle of the gutter, each hour
  interrupting the dots in its own gap. **Five days visible**, the rest a
  scroll away — a column is only as useful as the block it can hold. Blocks
  inset 8px from the column edge and 16px from the top of the grid.
- **Month** — 6×7, up to three items per cell then "+N more", today marked with
  an accent **ring** (a filled square would read as a selected day). The lead-in
  offset is derived from the week's own data, never a literal.

### 3 · Workspace (`WorkspaceScreen.jsx`, `Team.jsx`, `Flow.jsx`, `TaskRow.jsx`)

Three views: **List**, **Kanban**, **Flow**.

**Flow is the one worth building first**, because it answers what the other
two structurally cannot: *what cannot move, and why*. Stages run left to right
(`NEEDT.stages` — To do, In progress, In review, Done) and a task that is
waiting is joined by a drawn line to the thing it waits on.

- **The line is the content**; the columns are only where it has to go. It is
  routed through a vertical **lane in the gutter** — out of the source's side,
  down the lane, into the target's side, rounded corners — *not* as a cubic
  between two card edges. A cubic only reads when the horizontal run exceeds
  its own control offset, and on a stage board with a 16px gutter it does not:
  the curve folds into a vertical squiggle. Route from **measured**
  `getBoundingClientRect`, choosing each card's side from where the cards
  actually are; stage order and dependency order are independent, so a task in
  Review can block one in To do.
- **It ranks.** `NEEDT.unblocks(task)` counts, through the chain, how much
  work a task is holding up. The free task holding up the most is named at the
  top — "Do this first — it frees 3". Every other project view treats its
  items as equal, and "what do I do first" has an answer that is almost never
  the most urgent thing.
- **A stage header states what is STUCK in it**, not how many items it holds.
  An item count is the one number every board already shows and nobody acts on.

**List** is the grouped task table, with the **team strip** above the filter. Each person carries their open count and hours; the ones holding
something up say so in words — "blocks one of yours". A count there would be a
score; the sentence is a fact about your week.

Every task row shows the face of whoever holds it, and — when it cannot move —
one line: "Waiting on Anna for the legal sign-off". **A blocked task looks
exactly like a task nobody has started, and that is how a week goes missing.**

### 4 · Documents (`DocsScreen.jsx`) · 5 · Settings (`SettingsScreen.jsx`)

Documents: pinned grid plus a list, each card a miniature of its own text.
Settings: searchable sections opened in place — Appearance (theme, drift, rail
language, density), Day, Scheduler, Calendars, Notifications, Account.

### 6 · Sign-in and setup (`AuthScreen.jsx`, `MobileAuth.jsx`)

Desktop pairs the form with a live plate of a day. Five setup steps: You, Your
hours, **How you work** (the three grounds as miniatures — the default view is
chosen by recognising a layout, not by reading a name), Calendars, First tasks.

### 7 · Phone (`Mobile.jsx`, `MobileAuth.jsx`, `mobile.html`)

402×874. The desktop is two panes; a phone has room for one, so the rail's four
jobs go four different ways: **navigation** to a bottom bar, the **queue** to a
sheet, **focus** to the header, the **mini month** to a day strip. Every tap
target clears 44px. Tapping any card opens the task sheet: the two-minute entry
and the parts at the top, attributes as a list where the value is the control.

---

## The task object (`RichBlock.jsx`)

**One component, three layouts.** A task is the same object wherever it is met,
and `rbShape()` is the single adapter from a store task to what the component
draws.

| Layout | Where | Geometry |
| --- | --- | --- |
| `weight="open"` | Calendar grid, Home | Tile 34px, title, time, payload rows |
| `weight="compressed"` | Dense grid, lists | 44px, two lines — title, then time |
| `weight="row"` | Workspace table | Grid columns shared with the header |
| `weight="declined"` | Declined events, blocked hours | Grey, struck eye, time only |

**Content by height**, and nothing wraps to a second line at any height:

| Height | Shows |
| --- | --- |
| `< 22px` | Title only |
| `22–40px` | Title + time on one line, time right-aligned, 11px |
| `40–70px` | Title line, time line |
| `> 70px` | Plus one meta line (project dot + part counter) |

**Content by width:**

| Width | Change |
| --- | --- |
| `< 120px` | No project dot |
| `< 90px` | Checkbox leaves the flow; rail thickens 3px → 5px; checkbox overlays on hover |
| `< 64px` | The whole cluster stops splitting and becomes one chip ("2 tasks · 1 event") that opens a popover in place |

**The collapse order.** Every payload row has a height and a rank; the block is
given a height and spends it down the list until the budget runs out. A fact is
shown **whole or not shown** — never clipped. Order: place (29) → entry (28) →
link (29) → attachment (29) → preview (60) → note (20). Header 38px.

**Overlap.** Half width means intersection and nothing else:

- Non-overlapping blocks: full width, always.
- Two blocks whose overlap is under half of **both** durations: **cascade** —
  the later one indents 12px, keeps full width, draws above. (Both halves of
  the AND must hold; testing one duration was a real bug.)
- Otherwise *n* blocks: *n* columns, 4px gutter, ordered by start then by
  duration descending. No cascade at 3+.

**The two-minute entry** is the one thing on a block you press, so it is the one
thing built as a control: the raised default button, 28px, radius 10, arrow in
the project's hue, "2 min" right. On hover the label cross-fades to "Start the
focus". Not a green fill — solid colour on a button is the thing this system
does not do, and `--success` means "done", the opposite of an invitation.

---

## Data model

`Data.js` is the fixture; its shape is the contract.

```js
task = {
  id, title, project,          // project is the NAME ("Operations")
  due, est,                    // "4 Sep", minutes
  done, status, overdue,
  at,                          // hour it sits at, 0–24
  time,                        // display string when pinned
  parts: [{ title, done }],    // one level only; a part can be promoted
  entry,                       // the two-minute first step
  value, earned,               // money tasks
  noSlot,                      // belongs to no day — no rail, nothing to move
  movedFrom,                   // the scheduler moved it; shown as a mark
  age,                         // days untouched; fades past 21
  heat,                        // 0–1, drives the category flame
  holder,                      // person id
  waitsOn: { on, for },        // person id + what is awaited
  stage,                       // "todo" | "doing" | "review" | "done"
  blockedBy                    // id of the task that must close first
}
```

Also exported: `projects` (id, name, hue, glyph), `calendars`, `people`,
`stages`, `habits` (`done` = last 14 days, oldest first), `closedDays`, and
the helpers `project(ref)`, `person(ref)`, `blocking(tasks)`,
`blockerOf(task)`, `unblocks(task)`, `streak()`, `dateLabel(d)`,
`shiftWeek(n)`.

**`blocking()`, `blockerOf()` and `unblocks()` are derived, never stored** —
a chain that is written down disagrees with its own tasks by Thursday.

---

## The corner speaks in three registers

Bottom right is the one place this product speaks from, and it has three
voices in one object. Building them as three separate widgets is the mistake
to avoid — the whole point is that they are the same thing at three sizes.

**The pill** (`Chat.jsx`) — 116×40, closed.

**The island** — the *same element* swelling to 376×54 for about seven
seconds to say one thing, then shrinking back. It is not a toast: a toast is a
second object appearing beside the first, which is why toasts are ignored —
nothing on screen changed, something merely arrived. Here the object you
already know grows, carries the message, and returns. The motion **is** the
notice. Contents are hints and reports (`CHAT_NOTES`), each of which either
teaches something the product can do or reports something it just did; never
praise, never a count of things that are fine. First after ~9s, then minutes
apart, and never while the panel is open or the agent is mid-run.

**The panel** — 392×496. Your line is a raised card on the right, its line is
prose on the left with an accent tile: a conversation reads as two voices only
if they are set differently, and the thing that should look like an object you
placed is the one you typed.

**Notifications** (`Notifications.jsx`) are the fourth thing and the only one
that is a separate element — because they must survive being read and acted
on, which a morphing pill cannot do. They stack **above the pill on its own
gutter**, newest at the bottom (nearest the pill, where the eye already is),
older ones folded back at `scale(1 − depth×0.035)` and dimmed. Past four they
are dropped. Arrival overshoots its resting place by 3px and returns — the way
a hand slides a card onto a desk. Hovering the stack stops the auto-dismiss
clock: reaching for a card is the clearest possible statement that you are not
finished with it. API: `window.__notify({kind, title, body, when, acts, ms,
sticky})`; `acts` may carry `{say}` to run the agent or `{go}` to move the
app through `window.__go`.

---

## The agent cursor: a hand, not a spring

`AgentCursor.jsx`. When something moves by itself the person is left with a
changed screen and no account of who changed it, so the app shows its own
hand doing it.

A damped spring is the obvious model and the wrong one: given a sideways push
it returns to line by oscillating, so the cursor sways on every trip. People
do not sway. A human reach has a measured shape — ballistic launch, short
corrective approach, no overshoot — and its velocity profile is the
**minimum-jerk curve, `10t³ − 15t⁴ + 6t⁵`**. Duration comes from distance the
way Fitts's law gives it: `clamp(210 + 190·log₂(d/90 + 1), 300, 760)` ms — far
targets take longer, but far from proportionally longer.

The path is **one quadratic bezier**, its control point fixed before the first
frame (perpendicular offset `min(len×0.11, 52)`, alternating sides so a
sequence does not trace the same hook twice). A curve decided up front cannot
argue with the easing; recomputing the bow per frame from the remaining
distance is what made the old version wobble as it arrived.

Three implementation rules that are not optional:
- **Position is written straight to the element** as `translate3d`. Through
  React state it re-renders the cursor tree 120×/s; through `left/top` it
  forces layout on every one of those frames.
- **It emerges from the chat button and returns into it** — scale 0.2→1 over
  300ms *before* the first reach, and back in at the end. A cursor present on
  the first frame has no origin.
- **Home is the corner, not the element.** Measuring `[data-agent-home]` at
  run time fails when the run was asked for in chat, because the panel is
  still open and the "button" is a 392×496 header. Measure
  `[data-agent-anchor]` and inset half a pill from its bottom-right.

---

## Performance: three rules the port must keep

Measured, not guessed — the app idles at 120fps with one running animation, so
every real cost was in interaction.

1. **Coalesce pointer work into rAF.** A pointer reports at display rate. The
   drag handler was doing `elementFromPoint` + a `setState` that re-renders
   every screen, 120 times a second, for a browser that paints once a frame.
   Record the position, publish once per frame, and publish nothing when
   neither the point nor the target changed.
2. **Never call `getBoundingClientRect()` inside `pointermove`.** It forces
   layout before it can answer, and on a 24-hour × 7-column grid that is the
   most expensive question in the app. Cache it; invalidate on scroll and
   resize.
3. **Do not observe every card.** A `ResizeObserver` per card fires through
   entry staggers and hover shadow changes; observe the container and use one
   settle timer for the entry.

---

## Three details that are easy to get wrong

**The miniature (`Miniature.jsx`).** Every thumbnail in the product — the five
themes in Settings, the default-view step in setup, the brief's three forms —
is a **real screen of the app drawn at full size and scaled down**, not a bar
diagram. It renders 320×206 with the rail, the wordmark, nav rows, the project
list, a header with its toggle, real cards with project tiles, an hour grid
with a now-line, and then applies `transform: scale(width / 320)`. Text at
10px scaled to 0.41 is 4px: unreadable, but shaped exactly like type — which is
what a screenshot looks like at thumbnail size, and what grey bars never look
like. **One component for all of them**; five implementations of "a small
picture of a screen" is five chances to look like five products. Kinds:
`day`, `columns`, `grid`, `prose`, `canvas`. A `half` prop renders one
screen cut down the middle in two themes, for the System theme.

**The Home tab mark.** A 6px destructive dot on the Home tab (7px on the
phone), ringed in the page background so it does not merge with the glyph. It
counts **what is still open for today** — overdue, or dated today — not tasks
in general. A dot that is lit whenever tasks exist is lit forever and says
nothing; this one goes quiet when the day is clear, and that is the only thing
that makes the lit state worth a glance.

**The walls on Home.** Overdue sits off the left edge and Tomorrow off the
right; reaching the 22px lip slides one in over the day. They park **fully out
and at zero opacity** — every attempt at a visible sliver produced an artefact
(at full opacity a card with a cut-off corner, dimmed a grey stub, blurred a
uniform dark rectangle, because blur smears content without dissolving the
element's own bounds). The container must `overflow: clip`, not merely hide:
a `transform` does not remove an element from an ancestor's scrollable
overflow, so without it the day scrolls sideways and reveals the parked shelf
lying in the margin.

---

## Design tokens

### Project hues (this project's own)

| Project | Hue |
| --- | --- |
| Operations | `#FF7A45` |
| Design system | `#4C8DFF` |
| German | `#B072FF` |
| Resale | `#2FD08A` |
| Life | `#FFC53D` |

Calendars: Work `--accent`, Personal `--success`, Family `--info`.

### Themes (`themes.css`)

Five: **Paper**, **Warm**, **Dim**, **Dark**, **System**. System reads
light/dark from the OS and lets the user pick which theme fills each half of
that pair; its thumbnail is one day cut down the middle by `clip-path`, not two
miniatures side by side.

**Drift** is a separate toggle over any theme: the paper warms and cools by the
sun at the user's location, light turns dark at night, evening text contrast
softens, animation volume drops. It crossfades over half an hour — the best
drift is the one nobody catches working. **The accent never drifts.**

### Raised objects on a dark ground — the one token override

On paper an object reads as raised because a light surface sits above the
shadow it casts. On a dark ground that mechanism is gone: a black shadow under
a dark-grey surface separates nothing. Real objects on dark grounds are read by
their own **edges**, so `.dark, .dim` override `--shadow-raised` as a
directional bevel — bright top, dark bottom, faint containing ring — over
deepened cast layers. Pressed inverts the bevel.

### Type

Inter 13/12 chrome, 16 document body, 15/600 card titles, 22/600 page heading.
**Instrument Serif** 28px+ only. **JetBrains Mono** for values that must align
down a column: gutter hours, token tables, shortcuts. A time *inside* a block
aligns with nothing, so it is Inter with tabular figures — mono there reads as
another product's typography.

**Exposure VAR** (`ExposureTrialVAR.woff2`, single axis `EXPO` −100…+100) is the
wordmark only. Duplexed: advance width is identical at all axis positions, so
no width lock is needed.

### Motion

Two base transitions: `0.25s ease` theme crossfade, `0.15s ease` hover. On top,
the living layer (`index.html`, applied through the design system's own class
names so it reaches every screen without touching a component):

| Motif | Duration · curve | Trigger |
| --- | --- | --- |
| `needt-rise` | 0.46s · `(.2,.9,.24,1)`, 26ms stagger | A list arrives |
| `needt-land` | 0.36s · same | A chip or dot lands |
| `needt-menu-row` | 0.20s, 20ms stagger | A menu cascades |
| `needt-tick` + ring | 0.32s + 0.60s ease-out | Something is closed |
| `needt-tab-fill` | 0.28s | The active nav row |
| `needt-breathe` | 5.2s loop | Wordmark, focus aura, composer glow — one rate for everything alive |
| card hover / press | 0.24s / 0.09s | −1.5px lift, then settle |

All of it off under `prefers-reduced-motion`.

---

## Component manifest

Each file owns one object. This is the decomposition to port.

| File | Owns | Key exports |
| --- | --- | --- |
| `Data.js` | The store | `NEEDT` |
| `RichBlock.jsx` | **The task, all layouts** | `RichBlock`, `rbShape`, `RbTile` |
| `TaskRow.jsx` | Table header + row wrapper | `TaskRow`, `TaskTableHead` |
| `ColumnsView.jsx` | Day columns, cards, sort | `ColumnsView`, `CvCard`, `cvSort` |
| `ColumnsScreen.jsx` | Columns data + overflow logic | `ColumnsScreen` |
| `CalendarScreen.jsx` | Hour grid, week, month | `CalendarScreen`, `WeekGrid`, `MonthView` |
| `BlockDesigns.jsx` | Grid block → `RichBlock` adapter | `Block`, `blockHeight` |
| `HomeToday.jsx` | Home's day + the two walls | `HomeToday` |
| `Brief.jsx` | Prose and canvas brief, week close | `Brief`, `ProseBrief` |
| `Habits.jsx` | Habit rail and shelf | `HabitRail`, `HabitShelf` |
| `Team.jsx` | People strip, faces, waiting line | `WsTeam`, `WsFace`, `WsWaiting` |
| `Flow.jsx` | Stages, the chain, the ranking | `FlowView`, `flPath` |
| `Miniature.jsx` | **Every thumbnail in the product** | `Miniature` |
| `Composer.jsx` | Capture line, parser, chips, shelf | `Composer`, `coParse` |
| `Sidebar.jsx` | Rail, queue, focus, profile | `Sidebar` |
| `Dialogs.jsx` | Task editor, command palette | `TaskDialog`, `Palette` |
| `Drag.jsx` | Drag ghost, landing, refusal | `useDrag`, `DragGhost` |
| `AgentCursor.jsx` | macOS pointer that acts | `AgentCursor` |
| `ExposureWordmark.jsx` | The variable-axis wordmark | `ExposureWordmark` |
| `Drift.jsx` · `Flame.jsx` · `Minutes.jsx` | Drift clock, category flame, two-minute drawer | |
| `Mobile.jsx` · `MobileAuth.jsx` | The phone shell, sign-in, setup | `MobileApp`, `MbAuth`, `MbSetup` |
| `themes.css` | Five themes, drift, shared object CSS | |

**Shared CSS lives in `themes.css`, not in a shell.** The `.rb-entry` rules were
duplicated per shell once and immediately drifted: the phone ended up with the
hover and press states and no base rule under them, so the button rendered in
the browser's default grey with both of its cross-fading labels printed on top
of each other.

---

## Reference pages in the bundle

Open these to see an object in every state at once:

| File | What it shows |
| --- | --- |
| `index.html` | The desktop app |
| `mobile.html` | The phone, ten stills across three themes |
| `spec.html` | Tokens, components, states, motion table |
| `rich-block.html` | The task object: every weight, both grounds |
| `blocks.html` | Object inventory — every state and the prop that produces it |
| `motion-lab.html` | Eight motion events, replayable, with durations |
| `columns.html` · `composer-lab.html` · `accent-studio.html` · `exposure-wordmark.html` · `auth.html` | Single-object labs |

---

## Assets

- **`ExposureTrialVAR.woff2`** — the wordmark's variable font. Trial licence;
  clear it before shipping.
- **Icons** — `needt-icons.js` resolves every name from `react-icons/lu` with
  fallbacks. In production import the glyph directly:
  `import { LuCalendarDays } from "react-icons/lu"`. The design system's `Icon`
  is a *contract*, not a dependency — it renders what you pass or what the host
  registered, and a reserved empty box otherwise.
- **No photography, illustration or logo.** There is none in the product and
  adding some is a change of direction.

## Where the files are

Everything is in `needt-app/` in this download. The bound design system is at
`_ds/needt-design-system-main-25d3c8e5-a812-464d-881f-e887b9adef4b/` — link its
`styles.css` and load `_ds_bundle.js`; do not recreate its components.
