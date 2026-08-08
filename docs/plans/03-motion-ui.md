# 03 — Animation system, notifications, Space

**Model:** GPT-5.6 Terra Medium. Visual work against a fixed contract; no schema
and no security surface.

**Independent of 02** — can ship before or after it.

**Status:** complete (2026-08-08).

## Context

- Overlay and menu animation already runs off the in-app motion flag; the
  house format is fixed in `design-refs/ui-conventions.md` (token colours, no
  glow, no backdrop blur).
- `src/lib/notifications.ts` is the only public entry point for notifications;
  only that facade and the shared Toaster may import Sonner
  (`docs/STACK.md`, "Shared UI contracts").
- `npm run check:ui-contracts` enforces these invariants — it will fail the
  build if a second competing system appears.

## Non-goals

- No second animation library and no per-screen animation styles.
- No new notification entry point.
- No parent transform animations wrapping Excalidraw or Tiptap — they break
  pointer coordinates inside those canvases.

## Tasks

### 3.1 One MotionConfig boundary

Move the shared animation system onto `motion/react` behind a single
`MotionConfig` that accounts for the system reduced-motion setting, the in-app
Animations preference, and a hidden tab. All later UI plugs into this boundary
instead of adding its own transforms.

*Validate:* `npm run type-check && npm run check:ui-contracts`

### 3.2 Calm the motion vocabulary

Remove hover-lift, heavy press-squash, independent icon scaling, and dialog
zoom. Keep short fades and slides; reserve springs for drag and layout.

*Validate:* `npm run test:visual && npm run test:style`, diffs reviewed by hand

### 3.3 Typed presets

Expose `fade`, `panel`, spatial/drag/layout springs, `stagger`, and an instant
reduced-motion variant as typed presets so screens stop hand-rolling values.

*Validate:* `npm run test:unit -- motion-presets`

### 3.4 Notification surface

Use an animated list as the visual layer only. `src/lib/notifications.ts` stays
the single public API. Add dismiss, queueing, dedupe, pause-on-hover, and
`aria-live`.

*Validate:* `npm run test:unit -- notification-facade && npm run check:ui-contracts`

### 3.5 Space canvas

Remove the black background and dots. Add a transparent particle canvas —
white in dark themes, black in light — that never intercepts pointer events and
stops entirely under reduced motion or a hidden tab.

*Validate:* `npm run test:visual` plus a check that the canvas does not animate when the tab is hidden

### 3.6 Space task cards

Bring Space task cards onto the shared task-card style used by the calendar. Do
not create a second card component.

*Validate:* `npm run check:ui-contracts && npm run test:visual`

## Performance budget

- Calendar drag stays at 55–60 FPS with no long task over 50 ms.
- The ambient layer causes no continuous CPU or GPU work in a hidden tab or
  under reduced motion, and no layout shift.

*Validate:* record a trace during a drag and attach the frame timing to the PR notes

## Definition of done

Gates from `AGENTS.md` including visual and style suites with hand-reviewed
diffs, `design-refs/ui-conventions.md` updated, `CHANGELOG.md` updated, one
scoped commit. No push, no deploy.
