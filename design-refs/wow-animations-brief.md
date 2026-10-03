> **SUPERSEDED — 2026-09-11.** The design was replaced wholesale. The
> authority is now `needt-app/HANDOFF.md` inside the Claude Design project
> `Content height and label fixes`
> (`260768ff-eb30-4609-b2f7-d75b353033ed`), mirrored locally under
> `needt-app-design/` once the bundle is downloaded. See
> `docs/handoff/design-reconciliation-2026-09-11.md` for what changed.
> Nothing below decides anything. It is kept as the record of how the product
> got here, and for measurements that the new design does not restate.

# Wow-animations — implementation brief (for coding agent)

> **PARTLY SUPERSEDED 2026-08-31 by `/DESIGN.md`.**
>
> **Still valid, and it is the good half:** motion is functional or it does not
> ship — it shows what happened, never idle decoration. The libraries
> (`motion`, `@formkit/auto-animate`, `@number-flow/react`), the spring presets,
> the 150–250ms window and `prefers-reduced-motion` all stand.
>
> **Dead:** every reference to *Mina Liquid Glass*, glass surfaces, glow on
> event chips, the `#07070d` canvas and the 16/20/24 radii. The product is
> light-first, elevation is a hairline ring, and exactly one element in the
> whole app carries a backdrop blur. Take the timing and the discipline from
> this file; take the surfaces from `/DESIGN.md`.
>
> **Where the animation budget goes:** the schedule re-flowing. That is the one
> moment no competitor makes visible, and it is worth more than motion spread
> across eight screens.

> Goal: add premium micro-interactions to the **main app** (not just the landing).
> "Wow" here = smooth motion + physics + optimistic speed, NOT decorative glitz.
> Reference the app model: this is a Motion (scheduling) + Opal (focus) hybrid.

## Hard rules — respect existing conventions

Read `design-refs/ui-conventions.md` and `design-refs/motion-ui-spec.md` first, then obey them:

- **Control chrome stays flat.** Dropdowns, toggles, checkboxes, modal chrome: **no glow**, no `focus:border-[var(--accent)]` glow, overlay is `bg-black/55` with **no backdrop blur**. Do not animate these into something flashy.
- **Glow/glass is allowed only where the spec already allows it** — Mina Liquid Glass surfaces: canvas ambient, event chips (priority/energy glow), Focus mode, `.glass` panels. Keep new animation inside that language.
- **Timing:** short (150–250ms), **spring not linear** for anything that moves in space (drag, layout), ease-out for fades. Animations must be _functional_ — they show what happened (task moved, plan built), never idle decoration.
- Use `@/lib/date-utils` for dates, `logger` from `@/lib/logger` (LOG_SOURCE per file), never `console.log`. Keep changes scoped. Update `CHANGELOG.md` under `[unreleased]`.
- Respect `prefers-reduced-motion` — wrap non-essential motion, disable when set.

## Libraries to add

```bash
npm i motion @formkit/auto-animate @number-flow/react --legacy-peer-deps
```

- **motion** (motion.dev, ex-Framer Motion) — primary. `import { motion, AnimatePresence } from "motion/react"`.
- **@formkit/auto-animate** — one-liner list transitions.
- **@number-flow/react** — animated numbers.
- Already installed, reuse them: `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`, `@tanstack/react-query`, `cmdk` (commands in `src/lib/commands/`). Do **not** add a second DnD or animation lib.

Standard spring preset to reuse everywhere:

```ts
// e.g. src/lib/motion.ts
export const springSoft = {
  type: "spring",
  stiffness: 400,
  damping: 32,
  mass: 0.8,
} as const;
export const springSnappy = {
  type: "spring",
  stiffness: 600,
  damping: 30,
} as const;
```

## Features (in build order)

### 1. Optimistic UI (do this first — biggest perceived-speed win)

TanStack Query is already in the stack. For task create / move / complete / delete, use `useMutation` with `onMutate` optimistic update + rollback `onError`. The UI must react instantly before the server responds. Touch the mutations in the task flows (`src/store/task.ts` consumers, task API hooks). No new UI, pure speed.

### 2. AutoAnimate on task lists

Wrap task list containers (task page, inbox, project lists) with auto-animate so add/remove/reorder animates automatically:

```tsx
import { useAutoAnimate } from "@formkit/auto-animate/react";

const [parent] = useAutoAnimate();
<ul ref={parent}> … </ul>;
```

Cheap, high payoff. Apply to the list views under `src/components/tasks/`.

### 3. Drag-and-drop task → calendar with spring (core wow)

This is the flagship interaction (Motion's signature). Use existing `@dnd-kit`. Add spring inertia on drop via motion `layout` + the spring preset. Dragged chip lifts (scale ~1.03, raise z, subtle shadow — no neon glow), snaps into the slot with `springSnappy`. Wire into the calendar grid (`src/components/calendar/*`) and existing DnD handlers. Keep event-chip glow rules from motion-ui-spec (priority/energy), don't invent new glows.

### 4. Auto-schedule layout animation ("the AI did magic" moment)

When `TaskSchedulingService` returns `scheduledStart/End` for `isAutoScheduled` tasks, animate the chips settling into their slots. Give each scheduled chip motion `layout` + `layoutId` keyed on task id, wrap the grid in `AnimatePresence`; on schedule result the chips glide from old position to new with `springSoft`, lightly staggered. This visually communicates the engine working. Trigger off the scheduling mutation success.

### 5. Focus mode (Opal part)

There is a `focusMode` store (`src/store/focusMode.ts`). On enter: rest of UI dims via **opacity + scale** transition (NOT blur — house rule), active task scales up and centers, a circular progress ring animates the timer. Ring = SVG `stroke-dashoffset` animated with motion. On exit reverse. Use `.glass`/Liquid Glass surface for the focus card (glow allowed here). Respect reduced-motion.

### 6. number-flow on counters

Animate numeric transitions: task counts, focus minutes/streak, scheduled-hours totals. `<NumberFlow value={count} />`. Small touch, feels premium. Apply where counts already render (headers, focus stats, dashboard).

### 7. View Transitions between calendar / tasks / focus

Next.js 15 App Router supports the View Transitions API. Enable it for top-level view switches (calendar ↔ tasks ↔ focus) for native cross-fade/shared-element. Keep it subtle; gate behind reduced-motion. Enable `experimental.viewTransition` in `next.config.js` if needed and verify it doesn't break the SAAS/OS build extension logic.

### 8. Command palette polish (cmdk)

`src/lib/commands/` already exists. Add: spring open/close (scale 0.98→1 + fade), fuzzy-match highlight on results, subtle stagger on list items. Keep the popover flat per house format (shadow-lg, no glow).

## Acceptance checklist

- [ ] `npm run type-check` and `npm run lint` (`--max-warnings=0`) pass.
- [ ] No glow/blur added to control chrome (dropdowns, toggles, modals) — spot-check against ui-conventions.md.
- [ ] All motion respects `prefers-reduced-motion`.
- [ ] Springs used for spatial motion; durations ≤ 250ms.
- [ ] Optimistic mutations roll back correctly on error.
- [ ] The unified production build compiles and new source files use plain `.ts` or `.tsx` extensions.
- [ ] `CHANGELOG.md` updated under `[unreleased]`.

## Suggested order for the agent

1 (optimistic) → 2 (auto-animate) → 6 (number-flow) → 3 (drag spring) → 4 (auto-schedule) → 5 (focus) → 8 (cmdk) → 7 (view transitions). Ship and verify after each.
