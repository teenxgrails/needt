# AGENTS_MOTION_PARITY.md

Goal: make Flowday (this app) a **pixel-faithful clone of Motion** for the
calendar, settings, and all menus/modals — and fix the bugs listed below.
Work autonomously, phase by phase, committing after each phase.

You have **Chrome access**. The user is logged into both Motion and the
deployed Flowday site in that Chrome profile. USE IT — do not style blind.

---

## 0. Method (this is the important part — previous passes failed by guessing)

For every visual area you touch:

1. Open Motion in Chrome: `https://app.usemotion.com/web/calendar` (and
   `/web/settings`, task modals, etc. as needed). You are already logged in.
2. Open the deployed Flowday site in Chrome (the production Vercel URL — you're
   logged in there too).
3. **Measure Motion's real computed styles** with JS in the console, e.g.:
   ```js
   getComputedStyle(el).backgroundColor // color / border / font / padding / radius
   el.getBoundingClientRect()           // sizes & spacing
   ```
   Walk up the DOM for the effective background when a node is transparent.
4. Apply the measured values to Flowday. Re-open Flowday, screenshot, compare
   side by side with Motion. Iterate until they match. Never ship a value you
   didn't verify against Motion or the tokens below.

Do NOT reuse older AGENTS_*.md files — this one supersedes them for anything
visual. Keep changes scoped; follow `CLAUDE.md` (SAAS/open-source split, Prisma
singleton, date-utils, logger, no rewrite of the scheduling engine).

---

## 1. Verified Motion design tokens (measured from live Motion, July 2026)

Use these exactly. They are ground truth; only override if you re-measure and
find Motion changed.

| Token | Value |
|---|---|
| Page / sidebar background | `#1A1D1E` (rgb 26,29,30) — our `#1B1D1E` is fine |
| Calendar grid panel background | `#202425` (rgb 32,36,37) — **flat everywhere** |
| Grid lines (hour rows + day separators) | `#2B2F31` (rgb 43,47,49), 1px |
| Accent (indigo) | `#6366F1` |
| Working vs non-working hours | **NO difference** — Motion grid is flat. Do not shade. |
| Today column background | **NO tint** — flat `#202425` (only the header number gets a pill) |
| Hour row height | ~60px / hour |
| Time axis labels (left gutter) | 10px / weight 400 / `#9BA1A6`, format `9 AM` (no `:00`) |
| Timezone label (top-left corner, e.g. `CEST`) | 12px / 500 / `#9BA1A6` |
| Day header weekday (`Mon`) | ~13px / 500 / `#9BA1A6` |
| Day header number (`6`) | 14px / 600 / `#9BA1A6`; **today** = number only inside an accent pill, white text |
| Toolbar title (`Jul 2026`) | 20px; `Jul` bold, `2026` normal/`#9BA1A6` |
| Toolbar buttons | 13px / 500, padding 3px×6px, height 25px, radius 6px |
| Event chip | bg `#404040`, no border, radius 4px; title 12px / 500 / `#F2F2F2`; time text grey |
| Now-indicator | **white** line + white dot at the left end (not accent/blue) |
| Hover guide line | dashed line following the cursor, snapped to 15-min, with a small time label; the drawn hour lines stay hourly |

---

## 2. Already done this session (verify & polish, don't redo from scratch)

In `Calendar.tsx`, `WeekView.tsx`, `DayView.tsx`, `globals.css`:
- Toolbar: `Jul 2026` title; right side = Calendar options menu, Refresh all
  tasks, `+` new event, single `Week ▾` view switcher. Removed Booking links /
  Open / the duplicate Auto Schedule button.
- Day headers `Mon 6` with today-number pill; `CEST` corner label.
- Grid flattened to `#202425`, lines `#2B2F31`, hourly-only lines, `9 AM` time
  format, white now-line + dot, dashed 15-min hover guide line.

Confirm these match Motion in Chrome and fix any remaining drift (spacing,
exact colors, the tz label showing `GMT+2` vs `CEST` in some zones).

---

## 3. Bugs to fix

1. **"Sign In" appears while logged in.** The auth indicator flickers to
   "Sign In" on calendar/tasks/chat but shows the avatar on settings. Use a
   single source of auth/session state; always render the avatar + profile
   dropdown when authenticated. No flicker on route change or reload.
2. **Occasional lag / jank.** Profile the calendar and navigation. Common
   causes: re-rendering the whole event list on every store change, heavy
   framer-motion layout animations, unmemoized handlers. Memoize, virtualize
   where sensible, and gate/reduce animations so interaction stays smooth.
3. **Animations not Motion-like.** Match Motion's motion feel: fast, subtle
   (~120–180ms ease-out), no bouncy/oversized transitions. Open Motion, observe
   view transitions, menu open/close, event hover, and mirror the timing/easing.

---

## 4. Settings — rebuild to match Motion

Current settings look off. Open Motion's settings in Chrome and match its
layout, spacing, section grouping, control styles (toggles, selects, inputs),
and typography. Keep our existing settings functionality wired up; this is a
visual/UX reskin to Motion, section by section (General, Calendar/accounts, AI,
Customization, etc.). Measure and match.

## 5. Menus & modals — match Motion

Bring every popover/menu/modal to Motion's look & interaction:
- **Add task / add event** modal and quick-create.
- Calendar options menu, view switcher, profile dropdown.
- Event quick-view popover, task quick-view.
- Command palette (⌘K) and search.
Match Motion's rounded panels, background (`#202425`-ish elevated surfaces),
borders (`#2B2F31`), padding, and animation. Verify each against Motion.

---

## 6. Per-phase checklist (run every phase)

- Migrations if schema touched: `pnpm prisma migrate deploy` (schema may extend
  only for AI keys / chat history / project fields / customization).
- `pnpm tsc --noEmit` — clean.
- `pnpm test:unit` — green.
- `pnpm build` — succeeds.
- Open the deployed/local site in Chrome, screenshot the area you changed, and
  compare to Motion. Append findings + before/after notes to `QA_REPORT.md`.
- Commit per phase with a clear message.

Do not mark a phase done until Chrome comparison shows it matches Motion.
