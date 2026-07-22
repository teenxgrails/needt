## Why

Today has the right building blocks but does not yet feel like one daily planner. The desktop layout gives the document and timeline noticeably different widths, the day heading is scaled like a mobile hero, the editor is only a short text area above separately rendered task groups, and task density does not match the Motion AI Agenda reference. This makes the screen feel assembled from widgets instead of being a calm Notes-like working canvas.

## What Changes

- Keep the app's existing left navigation unchanged and rebuild only the Today surface.
- Make the desktop Today document and one-day timeline an approximately 48/52 split, with the timeline slightly wider.
- Turn the central area into one full-height, borderless daily document where prose and canonical task references can live in the same flow.
- Keep tasks in the existing `Task` model; agenda content stores only prose/formatting and task IDs, never duplicated task data.
- Match Motion's desktop density: a compact day header, larger readable task rows, correctly sized completion controls, inline date/duration metadata, and deliberate section rhythm.
- Preserve the existing date and duration pickers, Edit Task modal, autosave, day history, slash commands, mobile behavior, and the one-day timeline, while fixing their unfinished states.
- Add focused functional and visual coverage for Today in dark/light desktop, tablet, and mobile layouts.

## Capabilities

### New Capabilities

- `today-daily-document`: Defines the per-day editable document, canonical task-reference blocks, autosave/history behavior, and slash-command task creation.
- `today-desktop-composition`: Defines the desktop split layout, document typography/density, and one-day timeline relationship.

### Modified Capabilities

<!-- No existing OpenSpec capability currently owns Today. -->

## Impact

- Primary ownership: `src/components/today/*`, `src/app/(app)/today/page.tsx`, and `src/app/api/daily-agenda/route.ts`.
- Today-scoped styles in `src/app/globals.css` and Today visual/e2e fixtures.
- Existing `DailyAgenda.content` remains the storage seam; no destructive migration is planned.
- `TaskModal`, task APIs/store, app shell/sidebar, and the main Calendar screen are reused, not redesigned in this change.
- The parallel Calendar workstream must avoid `src/components/today/*` and the daily-agenda API. Any shared-file change requires coordination first.
