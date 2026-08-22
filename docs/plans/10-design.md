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
calm. This track moves the system from *invisible* to *intentional*: still fast,
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

## D0 — Identity spike (start here)

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
- The trigger is named in plain language — "Moved 3 tasks to fit *Design review*".
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
panels exist in file `8AWth2ENxFUbIfa0rV9D4o`. They document *where Needt is
today*, which is useful as a before/after record. They are not the target.
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

| Phase | Blocks on | Runs during |
|-------|-----------|-------------|
| D0 identity spike | nothing | plan 09 L0–L2 |
| D1 motion language | D0 owner decision | plan 09 L1–L4 |
| D2 signature reflow | D1 | pairs with 09 L7.1 |
| D3 foundations | D0 | alongside D1 |
| D4 navigation | D3 | before launch only if trivially safe |
| D5 screen rollout | D4 **and 09 L6 launched** | post-launch, flagged |
| D6 craft pass | D5 | post-launch |

**Hard rule:** nothing in D4–D6 may delay plan 09. Launch ships the current UI.
The redesign is a deliberate, visible release of its own.
