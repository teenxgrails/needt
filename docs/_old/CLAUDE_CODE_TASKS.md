# CLAUDE_CODE_TASKS.md

Instruction set for Claude Code. Goal: fix regressions Codex introduced, add
missing Motion parity, improve performance, and build the "today's tasks" panel.
Work phase by phase, commit after each phase, follow `CLAUDE.md` conventions
(SAAS/open-source split, Prisma singleton, `@/lib/date-utils`, logger, no rewrite
of the scheduling engine). Reference tokens are in section 0.

If you have Chrome/browser access, open Motion (`https://app.usemotion.com/web/calendar`,
`/web/settings`) and match visually. Otherwise use the measured tokens below.

---

## 0. Verified Motion design tokens

| Token | Value |
|---|---|
| Page / sidebar background | `#1B1D1E` |
| Calendar grid base | `#202425` |
| Grid lines (hours + day separators) | `#2B2F31`, 1px |
| Accent (indigo) | `#6366F1` |
| Time axis labels | 10px / 400 / `#9BA1A6`, format `9 AM` |
| Day header number | 14px / 600 / `#9BA1A6`; today = number in accent pill |
| Event chip | bg `#404040`, radius 4px, title 12px/500 `#F2F2F2` |
| Now-indicator | white line + white dot |

Relevant files: `src/components/navigation/AppNav.tsx` (left sidebar),
`src/components/calendar/MiniCalendar.tsx` (already exists),
`src/components/calendar/{Calendar,WeekView,DayView}.tsx`, `src/app/globals.css`,
`src/components/ai/AIChatSurface.tsx`, `src/store/task.ts`, `src/store/settings.ts`.

---

## Phase 1 — Restore the mini-calendar (Codex removed it)

Bring back the month mini-calendar in the **left sidebar**, above the nav list
(see reference: "July 2026", weekday letters M T W T F S S, today filled with the
accent pill, selected day a grey pill, ‹ › month arrows).

- Reuse `MiniCalendar.tsx`. Clicking a day sets the calendar date
  (`useViewStore().setDate`); the arrows change month.
- Style to match Motion: header `July 2026` (month bold), grey weekday initials,
  today = accent-filled rounded cell with white text, other days white on hover
  highlight, muted days from adjacent months.

Acceptance: mini-calendar visible in sidebar, navigates the main calendar, matches
the reference screenshot.

## Phase 2 — Restore & restyle calendar grid lines + working-hours shading

Codex removed the grid lines. Restore them and apply Motion-style shading.

Grid lines: hour rows and day separators = `#2B2F31`, 1px (set FullCalendar
`--fc-border-color`). Keep **hourly-only** lines (hide the half-hour minor line).

Background shading (lightness order — darkest = today, lightest = non-working):
- **Current day column**: stays uniform `#202425` (no working/non-working split).
- **Working hours, other days**: slightly lighter → `#24282A`.
- **Non-working hours, other days**: lighter still → `#282C2E`.

Implement via `.fc-non-business` (non-working overlay) and the business-hours
default, guarding the today column so it stays flat `#202425`. Fine-tune the
three values so the steps are subtle but visible.

Acceptance: hourly lines back, today column flat, other days show the two-step
working/non-working shading.

## Phase 3 — Move the AI button to the bottom-left

Move the AI Chat entry from the top of the sidebar to the **bottom-left**, placed
**above the profile + settings** row. Keep the ⌘/ shortcut and the pill styling.
The bottom cluster order (top→bottom): AI Chat button, then the profile/avatar +
settings + sparkle row.

Acceptance: AI button sits just above profile/settings; shortcut still works.

## Phase 4 — Instant page switching (kill the lag)

Navigation between app sections (Calendar, Tasks, Settings, AI) must feel instant,
like Motion — no full-page reloads or visible delay.

- Use Next.js client-side navigation (`<Link>` / `router.push`) everywhere in the
  app shell; prefetch primary routes.
- Keep the sidebar/shell mounted across route changes (persistent layout) so only
  the content pane swaps.
- Cache server data with TanStack Query (staleTime) so revisiting a page shows
  cached data immediately and revalidates in the background.
- Audit for accidental `window.location` navigations, unmemoized heavy renders,
  and blocking data fetches on route entry; make first paint instant.

Acceptance: switching sections shows content immediately (no spinner/flash);
Settings and other `app.` pages open with no perceptible delay.

## Phase 5 — "Today's tasks" panel above the calendar (left)

Add a panel in the **left area, above the calendar**, listing **today's tasks**.

Row (reference screenshots 3–4): a status circle + title + due time, e.g.
"○ Refund ftid amazon it nvidia  7:15".

**Urgency circle color, sorted most-urgent first:**
- Overdue / due very soon → **red** (`#F87171`), pinned to the top.
- Approaching → **yellow** (`#F59E0B`).
- Plenty of time → **green** (`#34D399`).
- Thresholds (how many hours/days count as red vs yellow vs green) are
  **configurable in Settings** (add a small "Task urgency" settings group; sensible
  defaults: red ≤ 2h or overdue, yellow ≤ today's end, green otherwise).

**Hover action (reference screenshot 4):** on row hover, a circular **play/start
button** fades/slides in with a smooth animation (~140ms ease-out).

**Start-task modal (reference screenshot 5) — "Start task now":** clicking the play
button opens a modal:
- Shows the task title.
- "How long are you going to work on this task now?" → duration dropdown
  (5, 15, 30, 45, 60, 90 min…).
- Note line: "We'll move current task(s) to a different time."
- Buttons: Cancel / **Start** (accent).
- On Start: allocate/schedule that duration now (trigger the existing scheduling
  engine — do not rewrite it) and optionally **start Focus** (a focus timer/mode;
  add a lightweight focus state + timer if none exists).

**Remember durations:** persist the chosen duration keyed by a normalized task
title/pattern, so future similar tasks are prefilled/auto-created with a similar
duration. Prefer minimal storage — reuse the task `duration` field plus a small
"duration memory" (a new Prisma model or a settings-scoped JSON is fine; schema may
extend only for this). Log via the `logger`.

Acceptance: today's tasks show above the calendar, sorted by urgency with colored
circles; hover reveals the animated start button; the Start-task modal allocates
time and can start focus; similar new tasks prefill a learned duration; urgency
thresholds are adjustable in Settings.

---

## Per-phase checklist

- `pnpm prisma migrate deploy` if schema changed (Phase 5 only, if you add a model).
- `pnpm tsc --noEmit` clean · `pnpm test:unit` green · `pnpm build` succeeds.
- Update `CHANGELOG.md` under `[Unreleased]`.
- Commit per phase with a clear message. Don't mark a phase done until its
  acceptance criteria are met.
