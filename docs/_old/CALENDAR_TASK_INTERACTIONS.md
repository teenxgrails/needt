# CALENDAR_TASK_INTERACTIONS.md

Goal: fix calendar item interactions and match Motion. You have Chrome access —
open Motion (`https://app.usemotion.com/web/calendar`, logged in) and copy the
real behavior/look. Follow `CLAUDE.md` and `design-refs/ui-conventions.md`
(token colors, no glow/blur, reuse `@/components/ui/*`, don't rewrite the
scheduling engine).

Key files: `src/components/calendar/WeekView.tsx`, `DayView.tsx`,
`MonthView.tsx`, `CalendarEventContent.tsx`, `EventQuickView.tsx`,
`EventModal.tsx`, `src/components/tasks/TaskModal.tsx`, `src/store/{task,calendar}.ts`.

---

## Phase 1 — FIX: clicking an existing calendar item does nothing

Right now clicking a task/event on the calendar has no effect (it used to open a
quick view). Debug and fix.

- Check `handleEventClick` in `WeekView.tsx`/`DayView.tsx` and the
  `EventQuickView` wiring — confirm the click fires, the item resolves, and the
  popover mounts/positions. Read the browser console and the app logs; look for
  errors, a swallowed click (an overlay with `pointer-events` capturing it),
  z-index issues, or a null `referenceElement`.
- Expected: **single click** on a task or event opens the quick-view popover
  (details + actions). **Double-click** (or "Open task/Edit" from the menu)
  opens the full editor (`TaskModal` / `EventModal`).
- Verify on both timed events and tasks, in Week and Day views.

## Phase 2 — Hover kebab (⋮) + task context menu (reference screenshots 1–2)

On hover over a calendar task/event, show a **⋮ (3-dots) button** in the
top-right of the chip, fading/sliding in (~140ms ease-out). Clicking it opens a
context menu matching Motion. Use `@/components/ui/dropdown-menu`.

Menu items (wire to existing store actions where they exist; group with
separators exactly like the reference):

- **Complete task** (green check) → `updateTask(status: COMPLETED)`
- **Cancel task** (red x) → set cancelled/archived status
- --- Copy link → copy deep link to the task · **Open task** → open full editor
- --- **Start task now** → open the "Start task now" modal (allocate time now)
  · **Change start date** · **Change deadline** · **Add time to task** (increase
  duration) · **Do later** (push start) · **Do ASAP** (prioritize/move to soonest)
- --- Duplicate task · Bulk duplicate task · Create project from task ·
  Save as template
- --- Unlock task (toggle locked) · **Unschedule** (clear scheduledStart/End)

For actions that don't have backing logic yet (Bulk duplicate, Create project
from task, Save as template), either wire them to the nearest existing capability
or add a clean stub that no-ops with a toast and a `//todo` — do not fake them
silently. Prioritize the ones that map to real task fields (Complete, Cancel,
Start now, Change start/deadline, Add time, Do later/ASAP, Duplicate, Unschedule).

Match the menu visuals to screenshots 1–2: dark `#202425`-ish panel, `#2B2F31`
dividers, muted icons, red/green accents on Complete/Cancel, comfortable padding.

## Phase 3 — Create tasks on the grid like Motion

Copy Motion's calendar create flow. Open Motion in Chrome and replicate it:
click (or click-drag to pick a duration) on an empty slot → a lightweight inline
quick-create appears where you type a title and press Enter to create; it should
default to a **task** (auto-scheduled per Task defaults) with the option to make
it an event, and honor the dragged time range.

- Reuse the existing selection handlers (`select`/`dateClick`) and task/event
  creation in the stores; don't rewrite scheduling.
- Match Motion's interaction feel and the popover styling (position at the
  cursor, keyboard-first: type + Enter to save, Esc to cancel).
- Verify side-by-side with Motion in Chrome (create, drag-duration, Enter, Esc).

## Phase 4 — Fix remaining bugs / audit

- Read the app logs (`logger`) and the browser console across Calendar, Tasks,
  Settings; fix errors and warnings you find.
- Known earlier issues to confirm fixed: the "Sign In" indicator flickering while
  logged in; any render loops; navigation lag.
- Do a quick pass for obvious broken interactions (drag/resize events, quick-view
  edit/delete, task complete from calendar).

---

## Per-phase checklist

- `pnpm tsc --noEmit` clean · `pnpm test:unit` green · `pnpm build` succeeds.
- Verify the changed interaction live in Chrome (and compare to Motion for
  Phases 2–3); append notes to `QA_REPORT.md`.
- Update `CHANGELOG.md` under `[Unreleased]`. Commit per phase.
- Don't mark a phase done until the click/menu/create actually works when tested,
  not just compiles.
