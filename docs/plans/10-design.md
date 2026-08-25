# 10 — Design identity track

**Status:** active, runs in parallel with plan 09. Owner-directed.

**Goal:** Needt stops looking like a Motion clone and gets an identity of its own
— one that a user notices in the first ten seconds and still likes on day ninety.

**Scope granted by the owner (2026-08-22):** full freedom, including flows.

---

## The position this track takes

Three things are true at once, and the plan has to respect all three.

1. **The foundation is good.** `src/app/globals.css` has a real three-layer
   semantic token system. `src/lib/motion.ts` has calibrated transitions on
   Motion 12. `MotionRuntime` already honors OS/user/hidden-tab reduced motion.
   None of this gets thrown away. It gets re-tuned.
2. **The identity is borrowed.** The IA, the sidebar, the density, the calendar
   language all read as Motion. That is not a polish problem, and no amount of
   spacing fixes it.
3. **"Wow" in a daily tool cannot come from decoration.** Needt is something a
   person sits inside for eight hours. Glow, gradients and spectacle read as
   premium for one session and as noise by the third. Every tool that actually
   feels expensive — Linear, Things, Raycast, Arc — earns it through **speed,
   motion that carries meaning, and typographic craft**. That is where this
   track spends its budget.

**The current motion tokens are deliberately invisible.** `fastFade` is 140ms,
`panel` is 180ms, offsets are 4–6px. That is a correct calibration for "do not
distract" and the exact reason nothing feels alive. Invisible is not the same as
calm. This track moves the system from _invisible_ to _intentional_: still fast,
still respectful, but things now come from somewhere and go somewhere.

### What this track will not do

Do not add: decorative gradients or mesh backgrounds, glassmorphism as a default
surface, purple-to-blue hero gradients, floating 3D shapes, generic illustration
sets, bouncy easings on frequent actions, animated logos, confetti, sound
without an explicit owner decision, or any effect that exists only to be seen.
These are the tells of generic AI-generated product design and they will make
Needt look cheaper, not better.

Do not degrade: keyboard navigation, reduced-motion behavior, touch targets,
contrast, or perceived speed. **A dropped frame reads as cheap. Sixty frames per
second or the effect does not ship.**

---

## D-1 — Escaping Motion (the actual problem)

**Owner assessment, 2026-08-22:** the current UI is close to a 1:1 copy of
Motion. The owner named four things that read as copied, and authorized changing
all of them, **including the set of sections**.

This is not only an identity problem. A near-copy of a competitor's interface is
a trade-dress risk, and it makes the product unusable as portfolio work — a
viewer who knows Motion sees the copy, not the author.

### The four copied elements

1. Left sidebar with a mini-month calendar on top, then search, then a flat list
   of sections. This is the single most recognizable Motion signature.
2. Task appearance on the calendar — coloured left rail, title plus small time,
   flat card.
3. Palette: violet accent on near-black.
4. The section set and its logic: Today / Tasks-with-tabs / Focus as peers.

### The structural move

Fixing 1–3 while keeping 4 produces a re-skinned Motion. The escape has to come
from **structure derived from Needt's own thesis**, which Motion does not share:
_the day plans itself, deterministically, and can explain why._

If that is the thesis, seven peer sections is the wrong shape. Proposed model:

- **One primary surface — the time canvas.** Today and Calendar stop being two
  destinations and become one continuous surface with a range switch (day /
  week). This alone removes the most Motion-like pair of sections.
- **The mini-month calendar leaves the sidebar entirely.** Range and date
  navigation belong to the canvas that owns time, not to the app chrome. This is
  the highest-signal single change in the whole redesign.
- **Tasks and Projects become lenses over the same data**, not separate
  destinations — a list view of the canvas, filtered. Not a parallel product.
- **Pages and Moodboards merge into one "documents" place.** Two entries for
  "things you write and draw" is Motion-style section inflation.
- **Focus becomes a mode, not a section.** It is a state of the current day, not
  a location you navigate to. Entering it is a transition, not a route change.
- **Mail needs an honest decision.** It already sits awkwardly as a tab inside
  Tasks. Either it is a first-class surface or it is cut. A compromise tab is the
  worst of both.

Result: roughly three destinations instead of seven, plus one capture action and
one mode. The sidebar then genuinely becomes "the main object of the app" in the
Arc sense — it holds identity, capture and places, not a directory of features.

**Risk:** high, and the most expensive option available. It changes routes,
navigation, E2E specs and visual baselines. It is authorized, but it must be
sequenced as its own release with the old routes redirecting, never as a big-bang
rewrite.

### Owner decisions, 2026-08-22

- **Today + Calendar merge into one time canvas — approved.** Own release, old
  routes redirect.
- **Mail becomes Inbox.** Container and naming only.
- **Support chat — cut.** Email is sufficient at this scale.
- **User-to-user chat — replaced** by a much safer idea: pin a person by their
  email address and filter the Inbox to correspondence with them. No messaging
  system, no moderation duty, no message retention obligations. Deferred, not
  current scope.
- **Third-party ads — do not build.** Upsell prompts and plan limits are fine;
  an ad network inside a planner contradicts the privacy stance and destroys the
  premium positioning this track exists to create.
- **Themes stay** dark grey and light. The base goes neutral; colour appears only
  on icons and category markers. **Colour must encode meaning** — a project or
  block type keeps one colour permanently. Decorative colour is what makes dense
  lists noisy, which is the exact failure Notion/Craft references avoid.

### Primary action button

The owner wants one deliberately premium control used on important actions
(create task), not an "AI button" and not everywhere. Specification:

- Press-in `scale(.98)` over 90ms, near-linear. Release springs back over 340ms
  with slight overshoot. The asymmetry is what reads as mechanical travel.
  Overshoot is acceptable here — a deliberate rare action, unlike moving
  schedule blocks where it becomes irritating.
- A 1px light line along the top edge. This imitates light falling on a raised
  surface and reads as volume. **A glow around the button reads cheap; a light
  edge on the button reads expensive.** No outer glow, no gradient fill.
- **Scarcity is the mechanism:** exactly one filled action per screen. Everything
  else is outline or ghost. Three filled buttons and none of them feel worth
  pressing.
- Show the keyboard equivalent inside the control.
- **The reward matters more than the button.** Creating a task must visibly send
  it to the slot the scheduler chose — the reflow in miniature. That is what
  makes the action feel worth repeating.

### Palette direction

Recommended: **warm charcoal with a clay accent.** The category is split between
cold black-plus-violet (Motion, Linear) and white (Things, Sunsama); warm
neutrals are largely unoccupied, and warmth reads as expensive at low cost.
Staying dark also preserves the owner's habit. Alternatives shown and available:
light sand with a deep green accent (the sharpest break from Motion), and deep
ink with teal (dark but clearly not violet).

Whatever is chosen: **the violet accent goes**, and the neutral ramp must move
off pure gray. Those two changes alone remove most of the palette-level
resemblance.

### Task appearance on the calendar

Owner explicitly asked for this to be solved rather than guessed. It is the
product's central screen. Constraints that are established practice, not taste:

- Blocks under ~30 minutes cannot hold two lines — define a single-line variant
  rather than clipping.
- Overlap needs a defined rule (side-by-side, inset, or stacked with a count),
  chosen once and applied everywhere.
- Time must use tabular numerals or columns visibly misalign.
- Scheduled-by-Needt blocks must be distinguishable from calendar events at a
  glance — this is Needt's core value and currently reads as the same object.
- Past, current and future blocks need distinct treatment; "now" is the most
  important position on the screen.

Design this as its own concept before touching the canvas layout.

## D0 — Identity spike

> **Narrowed by the owner on 2026-08-22.** After reviewing concept work, the
> owner selected Arc (sidebar as the app's main object, content to the top of
> the window) and Notion/Craft (quiet density, hover only on the hovered row),
> and rejected the Linear/Raycast precision-instrument character outright.
>
> That resolves the choice: **Needt is a sidebar-forward, calm, quiet product** —
> variant 3 (spatial canvas) crossed with variant 2 (calm editorial), definitively
> not variant 1. Do not rebuild all three variants below. Build **one** Today
> screen in that combined direction and use the spike only to settle open
> questions: type, density, and how far the sidebar-as-main-object idea goes.

**Prerequisite:** none. Runs immediately, in parallel with plan 09 L0.

The owner has not chosen a direction and asked to see real options rather than
descriptions. Build three, in code, and let them be judged by using them.

**Vehicle:** the existing `/style` laboratory (admin-gated in production per T4).
Do not build a throwaway prototype outside the app — the whole point is that the
options run against real components and real data.

Build the **Today** screen three ways. Today is the daily surface, it is where
Needt is most itself, and it exercises type, density, list rhythm, the day
timeline and motion all at once.

1. **Precision instrument.** Reference: Linear, Raycast. Dense, tight leading,
   monospace numerics and metadata, keyboard-first affordances visible, motion
   short and mechanical (120–160ms, near-linear), one cold accent, heavy use of
   hairlines over fills.
2. **Calm editorial.** Reference: Things, Bear, Craft. Generous whitespace,
   larger and better type with real hierarchy, soft springs, warm neutral
   palette, single accent used sparingly, content-first with chrome receding.
3. **Spatial canvas.** Reference: Arc, Rauno's work. Shared-element transitions,
   real depth ordering, tasks that physically travel between list and timeline,
   motion as the primary feedback channel.

Each variant must be **switchable live** in `/style` and must render the same
real data. Screenshots are not the deliverable — the running thing is.

**Done when:** the owner has used all three on desktop and on a phone and picked
one, or explicitly asked for a hybrid with named parts from each.

**Owner action required.** The rest of this track is blocked on this choice. Do
not proceed past D0 by guessing.

```bash
npm run dev
# then /style with the variant switcher
npm run test:style
```

---

## D1 — Motion system, re-tuned

**Prerequisite:** D0 decided.

Rewrite `src/lib/motion.ts` from a set of durations into a **semantic motion
language**, where every transition names the relationship it expresses.

- Define named roles, not raw numbers: `enter`, `exit`, `reposition`,
  `expand`, `dismiss`, `arrive`, `reflow`, `emphasis`. Components reference the
  role, never a literal duration.
- Establish a distance-aware duration curve — a 6px nudge and a 400px traversal
  must not share a duration. Short moves stay under 160ms; long spatial moves
  get 240–320ms with a decelerating curve.
- Adopt shared-element / layout transitions where an object genuinely persists
  across states. Motion 12's layout animation is already available; use it
  instead of cross-fading two different nodes.
- Define origin: overlays grow from the control that opened them, not from the
  viewport center.
- Keep every new transition behind `MotionRuntime`, so OS reduced-motion, the
  user setting and hidden tabs all still disable it. Extend
  `src/lib/__tests__/motion.test.ts` to cover the new roles.

**Performance budget, enforced:** transform and opacity only on hot paths, no
layout-triggering properties inside a running animation, 60fps on the reference
device, and no animation on a list longer than 50 items without virtualization.

**Done when:** every transition in the product resolves to a named role, and the
style suite proves reduced-motion still flattens all of them.

```bash
npm run test:unit -- --runInBand src/lib/__tests__/motion.test.ts
npm run test:style
npm run test:visual
npm run type-check
npm run lint
```

---

## D2 — The signature moment

**Prerequisite:** D1.

Every memorable product has one interaction people describe to other people.
Needt already owns the raw material and currently hides it.

**Needt's unfair advantage is the deterministic scheduler.** When a task is
added, a meeting lands, or something overruns, the whole day genuinely
re-plans — in `src/services/scheduling/`. Today that recalculation appears as a
silent data refresh. Motion (the product) does the same thing invisibly. Nobody
in this category animates it.

**Build the reflow as a visible, legible event.** When the schedule changes:

- Affected blocks travel from their old time to their new time with a staggered
  spring, rather than disappearing and reappearing.
- Blocks that did not move stay perfectly still. Stillness is what makes the
  movement readable.
- The trigger is named in plain language — "Moved 3 tasks to fit _Design review_".
- One affordance to undo the reflow, one to ask why.

This connects directly to plan 09 L7.1 (capacity, schedule explanation,
reversible what-if). **Build the animation and that feature as one thing.** The
what-if preview is the same reflow animation run speculatively — the user drags a
meeting, watches the day rearrange, and releases to accept or cancel to revert.
That is the screenshot that gets posted, and it is a real capability rather than
a decoration.

Secondary signature candidates, in priority order, one at a time:

1. **Entering Focus** — the world should recede, not cross-fade. Focus is already
   a flat state-stable canvas; the transition into it is the moment.
2. **Quick capture → scheduled** — a captured task should visibly travel to the
   slot the scheduler chose for it, so the user learns the system is working.

**Risk:** high. This is the one place where a dropped frame is fatal, because the
whole point is that it feels effortless. Prototype in `/style` against a large
seeded day before touching the real route.

**Done when:** a reflow of ten blocks holds 60fps on the reference device, reads
clearly at 360px, is fully disabled under reduced motion (state still updates,
just instantly), and never loses or misplaces a block.

```bash
npm run test:unit -- --runInBand src/services/scheduling
npm run test:e2e -- tests/tasks.spec.ts
npm run test:style
npm run test:visual
```

---

## D2b — Approved concept specs

**Implementation reference with exact values:**
[`design-refs/prototypes/README.md`](../../design-refs/prototypes/README.md).
Read it before building any of this — it carries the palette, the easing curves,
the durations and the calendar-block contract.

**Prerequisite:** D1. These were reviewed and approved by the owner on
2026-08-22. Build to these numbers; do not reinvent them.

**Use what is already installed.** Motion 12 is in `package.json` and ships
`layout` / `layoutId`, which is exactly the mechanism all four concepts need. It
is currently used in only two calendar files. Do not add GSAP, react-spring or
any other animation dependency.

### Schedule reflow (the signature moment)

- Only genuinely moved blocks animate. Unmoved blocks stay perfectly still —
  stillness is what makes the movement readable. Never animate the whole day.
- Stagger 45ms between moved blocks, `cubic-bezier(.22, 1, .32, 1)`, ~500ms for
  a full traversal. Decelerating, **no overshoot** — bounce on a frequent action
  becomes irritating by the third repetition.
- The explanation names the cause, not the fact: "Moved 1 task to free 14:00 for
  _Design review_" — never "Schedule updated".
- Undo sits next to the explanation, always. The user must see that nothing
  irreversible happened behind their back.
- Under reduced motion: positions update instantly, explanation and undo remain.

### Left sidebar

- **One shared indicator that slides** between nav items (`layoutId`), never a
  highlight that fades out on one row and in on another. The eye should track
  one object.
- **macOS window controls.** The desktop app is a PWA, not Electron/Tauri. Use
  `display_override: ["window-controls-overlay"]` and reserve the top-left zone
  with `env(titlebar-area-x)` / `env(titlebar-area-height)`. On macOS the
  controls sit on the **left** — directly over the sidebar — so the wordmark
  must start after that inset, not at x=0. Mark the strip `-webkit-app-region:
drag` and every control inside it `no-drag`.
- Wordmark lives in that same strip, beside the controls.
- **Collapse timing is asymmetric on purpose:** labels fade at 140ms while the
  width animates at 320ms. Synchronous timing visually crushes the text against
  the edge.
- Collapsed state must stay usable — not a strip of ambiguous icons.
- Hover feedback appears only on the row under the cursor; everything else stays
  completely quiet.

### Popovers and menus — one rule for all of them

Every overlay in the product grows from the control that opened it:
`transform-origin` set to the trigger corner, `translateY(4px) → 0`,
`scale(.98) → 1`, 160ms. No centre fades, no viewport-origin overlays, no
per-screen variations. This applies to the account menu, command palette,
context menus, pickers and dialogs alike.

### Settings toggles with live preview

- Each toggle row carries a 124×76 preview window showing **the actual result**
  in miniature — a slice of real UI, never an icon or illustration.
- The preview reacts immediately when the toggle flips.
- Animated previews run **only on row hover** and stop on leave. Thirty settings
  animating at once is unusable.
- Frozen under `prefers-reduced-motion`; the preview still shows the changed
  end state.
- Rows that cannot show a meaningful miniature get no preview box — do not fill
  the space with decoration.

### Reference techniques — owner-selected (2026-08-22)

The owner reviewed five candidate references and kept exactly two. Build toward
these; the rejected ones are not a fallback.

**Arc — the sidebar is the main object of the app**, not a service panel. It
carries identity, navigation and account, content runs to the very top of the
window, and the app reads as "a sidebar with a canvas" rather than "a page with
a nav strip". This is the strongest single signal about Needt's direction.

**Notion / Craft — quiet density.** Hover state appears only on the row under
the cursor; everything else stays completely still. A dense list must never look
noisy. No hover effects that move, scale or glow — contrast change only.

**Explicitly rejected as aesthetics:** Linear's precision-instrument density,
Raycast's overlay language, Things' playful list mechanics. Do not reintroduce
their visual character.

**But two non-aesthetic rules survive that rejection**, because they are hygiene
rather than style, and remain mandatory:

- Every overlay shares one origin/size/timing contract (see the popover rule
  above). Consistency of behavior is not a borrowed look.
- Perceived speed — optimistic updates wherever a mutation is safe. Slow is not
  a design direction.

## D3 — Foundations, re-tuned to the chosen direction

**Prerequisite:** D0 decided. May run alongside D1.

Retune the existing three-layer token system. Do not introduce a second one, and
do not revive the retired legacy shadcn HSL set.

- **Type.** Pick and license the typeface deliberately — the current stack is a
  default, and a default typeface is the single loudest "this is a template"
  signal. Define a real modular scale, deliberate leading per role, and tabular
  numerics everywhere time and counts appear.
- **Density.** Define one density scale and apply it consistently. Today, Tasks
  and Calendar currently disagree about row rhythm.
- **Color.** One accent doing real work, a neutral ramp with enough steps to
  express hierarchy without borders everywhere, and semantic states that are
  distinguishable without relying on hue alone.
- **Depth.** Decide the model — hairlines, or elevation, or both with rules. Right
  now it is hairlines by default with occasional inconsistency.
- **Light mode is not optional.** `/style` already covers Light, Graphite and
  Dark. Every decision here ships in all three or it does not ship.

Update `design-refs/app-design-system.md` and `design-refs/ui-conventions.md` in
the same commit as the tokens they describe. A design system doc that lags the
code is worse than none.

```bash
npm run test:style
npm run test:visual
npm run check:ui-contracts
```

---

## D4 — Navigation

**Prerequisite:** D3.

The sidebar is the most Motion-derivative surface and the owner named it first.

- Rebuild against the chosen direction. The owner referenced
  `shadeui.dev` Navigation (collapse/expand, accent items, a footer widget slot,
  explicit item states) as a structural reference — treat it as a reference, not
  a target to copy pixel for pixel.
- Resolve the current IA honestly: Today, Calendar, Tasks, Projects, Focus,
  Moodboards, plus Pages in the footer, plus Mail living inside Tasks as a tab.
  That last one is a compromise, not a decision. Decide it properly.
- Collapsed state must be genuinely usable, not a narrow strip of ambiguous
  icons.
- Keyboard navigation and the command palette are part of this surface, not an
  afterthought.

```bash
npm run test:e2e
npm run check:ui-contracts
npm run test:style
npm run test:visual
```

---

## D5 — Screen-by-screen rollout

**Prerequisite:** D4, and plan 09 L6 — production launched and stable.

**Do not ship a half-redesigned product.** Until this phase completes, the
redesign lives on its own branch behind a feature flag. Users see either the
current UI or the finished one, never a mix.

One screen per commit, in this order — highest daily contact first:

1. Today
2. Calendar
3. Tasks / Projects
4. Focus
5. Pages
6. Mail
7. Moodboards
8. Settings
9. Auth, onboarding, booking, public pages

Each screen: real data, all three themes, 360/390/768/desktop, empty state,
loading state, error state, reduced motion. Review every visual diff by hand.

**Captured Figma baselines** for eight primary screens and all sixteen Settings
panels exist in file `8AWth2ENxFUbIfa0rV9D4o`. They document _where Needt is
today_, which is useful as a before/after record. They are not the target.
Two captures failed and are empty black frames — Mail `55:2`, Boards `59:2`. Redo
them only if the before/after record matters to the owner.

**Figma is out of the pipeline for this track.** Figma Make produced unusable
output and Figma Agents is unavailable. Design happens in `/style` against real
components. Revisit only if the owner asks.

---

## D6 — Craft pass

**Prerequisite:** D5.

The difference between "good" and "expensive" lives entirely here.

- Every loading state: skeletons that match the real layout, never a spinner
  where content will land.
- Every empty state: says what to do next, in product language, with the action
  attached.
- Every error: what happened, what it means, what to do — never a status code.
- Optimistic updates everywhere a mutation is safe; perceived latency is the
  strongest quality signal in the product.
- Focus rings, selection states, drag affordances and hover feedback consistent
  across every interactive element.
- Real content in every screenshot and demo. Lorem ipsum hides bad hierarchy.

```bash
npm run check:branding
npm run check:ui-contracts
npm run test:style
npm run test:visual
```

---

## Sequencing

| Phase               | Blocks on                 | Runs during                                        |
| ------------------- | ------------------------- | -------------------------------------------------- |
| D0 identity spike   | nothing                   | plan 09 L0–L2                                      |
| D1 motion language  | D0 owner decision         | plan 09 L1–L4                                      |
| D2 signature reflow | D1                        | pairs with 09 L7.1                                 |
| D2b concept specs   | D1                        | sidebar/popovers safe pre-launch; reflow with L7.1 |
| D3 foundations      | D0                        | alongside D1                                       |
| D4 navigation       | D3                        | before launch only if trivially safe               |
| D5 screen rollout   | D4 **and 09 L6 launched** | post-launch, flagged                               |
| D6 craft pass       | D5                        | post-launch                                        |

**Hard rule:** nothing in D4–D6 may delay plan 09. Launch ships the current UI.
The redesign is a deliberate, visible release of its own.

---

## D7 — Owner-accepted concepts, 2026-08-26

Four concepts accepted on 2026-08-26. Each names the outside mechanism it came
from, because the point of each is a technique this product category does not
use. None replaces D2's signature moment; they are additions to the vocabulary.

Prototypes go in `design-refs/prototypes/`, numbered from 18, and are reviewed
by hand before anything reaches a screen.

### D7.1 — Margin marks after a reschedule

When the scheduler moves the day, the change is recorded as a persistent mark in
the left margin of the list, not as a re-animation of the block. The day is then
readable by scanning the margin instead of re-reading task names.

Taken from letterpress proof correction: the corrector puts a sign in the line
and a second symbol in the margin, so the compositor finds the place without
reading the page. Source: BS 5261 part 2.

Three marks minimum — moved, compressed, displaced. A mark persists until the
user has seen the day; it is not a toast.

**Prototype:** `18-margin-marks-after-reschedule.html` — eight tasks, three moved.
**Kill condition:** the margin needs a legend. If the marks are not readable
without one, this is a second column of noise.

### D7.2 — Three states of slack, and "you will make it" is drawn

A deadline gets three states, not two, and the safe state carries its own mark
rather than being the absence of a mark.

Taken from hydrographic charts, which mark safe water explicitly with its own
symbol alongside the hazard symbols, and which encode steepness through contour
spacing. Applied here: hatch density rises as slack is consumed, the way isobaths
converge at a drop-off. Source: NOAA Nautical Charts Tutorial.

This is the one that changes a decision the user makes today — "abandon or push"
is a question the current UI does not answer at all.

**Prototype:** one task in three states — slack above double the estimate, slack
below the estimate, no slack.
**Kill condition:** the third state reads as the first. Then two states are the
honest answer.

### D7.3 — A Marey chart for the day

Horizontal axis is time of day, vertical axis is cumulative completed work. Plan
is a straight line, actual is a broken one. Falling behind appears as an angle
rather than as a number.

Taken from the 1878 graphical train schedule, where the slope of a line is the
speed of the train. Source: Marey's Trains (Observable / D3).

**Prototype:** a ten-task day, two lines, the band between them is debt or slack.
**Kill condition:** at a typical five- or six-task day the line is too short to
have a slope.

### D7.4 — Calendar without a clock axis (a mode, not a replacement)

**Owner decision, 2026-08-26:** this ships as a **second calendar mode**,
switchable in settings, not as a replacement for the timed view. The sidebar
changes with the mode.

The day becomes a sequence of slots with durations and no absolute time. Meetings
stay as anchors and keep their times; everything else simply follows in order.
The reasoning: under auto-scheduling the exact time is an output of the system,
not a decision of the user, and showing clock times invites the user to fight the
scheduler over minutes that were never theirs to set.

Taken from heijunka production levelling, where the board carries a repeating
sequence and a takt rather than clock times. Source: Toyota Production System /
Kanban Zone.

Shipping it as a mode is what makes it testable: the timed view stays for whoever
needs it, and the sequence view is settled by use rather than by argument.

**Prototype:** `today-no-clock.html`, the same day as `14-today-target.html`,
without the time axis.
**Kill condition:** without clock times there is no way to see whether the day
fits inside working hours. Then the axis carries information, not habit.

**Open, to decide during the prototype:**

- The name of the mode in settings. Working title: Sequence.
- What the sidebar does — whether the mini-calendar disappears or becomes a slot
  count.
- Whether the switch is global or per-day.
- What happens to meeting blocks whose times are fixed.

### Considered, no verdict yet

**Workspace staves.** Each workspace holds a fixed vertical position in the day
and stays visible when empty, like a silent instrument in an orchestral score —
the conductor finds an instrument peripherally because it is always in the same
place. Source: MOLA music preparation guidelines. Not accepted, not rejected.
Kill condition if picked up: an empty stave costs height and the day stops
fitting on screen.
