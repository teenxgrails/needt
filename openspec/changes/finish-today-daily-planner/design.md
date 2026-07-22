## Outcome

Today becomes a coherent Motion-style daily workspace: a writable Notes-like document on the left and a slightly wider one-day timeline on the right, with canonical tasks embedded in the document and complete desktop/mobile behavior.

## Repository Reality

- `TodayView` currently composes a short `DailyAgendaEditor`, separate `AgendaTaskSection` lists, and `DayTimeline` in `src/components/today/TodayView.tsx`.
- The desktop grid is `minmax(560px,1fr)` plus `clamp(360px,32vw,600px)`, so the timeline is capped and looks too narrow on wide screens.
- `DailyAgendaEditor` in `src/components/today/DailyAgendaEditor.tsx` is Tiptap-backed but has a `112px` minimum height. `/task title` creates a task and removes the typed line; it does not leave a task block at the cursor.
- `src/app/api/daily-agenda/route.ts` safely stores sanitized per-user, per-date HTML in `DailyAgenda.content`.
- Task title, completion, date, duration, and modal editing already use canonical `Task` data in `useTaskStore`.
- Existing Today screenshots in `tests/visual/app-surfaces.spec.ts` cover appearance, but their desktop heading expectation is stale and they do not cover editing/history/failure paths.
- Visual direction: the user-provided Motion AI Agenda screenshot from 2026-07-22 and `design-refs/ui-conventions.md`.

## Scope and Constraints

### In scope

- Today document composition, task reference blocks, task interactions, per-day persistence, desktop split/timeline, responsive states, both themes, keyboard/accessibility behavior, and targeted regression evidence.

### Non-goals

- Redesigning the main Calendar route, app sidebar, Task modal, global navigation, scheduler algorithm, Workspace, Focus, Boards, Mail, or Settings.
- Creating a second task table or copying mutable task fields into agenda content.
- Adding collaborative documents, real-time multi-user editing, arbitrary embeds, tables, or a general Notion clone.

### Assumptions

- “Writable like Notes” means the full document area is directly editable without a textarea/card boundary, and task blocks may appear between prose blocks.
- On wide desktop the right timeline should be only modestly wider, not dominant.
- Existing tasks and `DailyAgenda` rows must remain compatible without a data migration.

## Requirements

- **REQ-001 — Desktop composition:** At viewport widths of 1280px and above, Today MUST use an approximately 48/52 document/timeline split after the app sidebar, with the right timeline slightly wider and no fixed `600px` cap.
- **REQ-002 — Daily canvas:** The document side MUST behave as one borderless, full-height editable canvas. Clicking unused document space MUST place the caret, and normal prose/heading/list/checklist/divider blocks MUST save per selected date.
- **REQ-003 — Canonical task blocks:** Task blocks embedded in the document MUST reference a canonical `Task` by ID. Completion, title, date, duration, and Edit Task state MUST always render from the task store/API rather than copied agenda HTML.
- **REQ-004 — Task interactions:** Clicking a task title MUST open the existing Edit Task modal; clicking the date or duration MUST open the shared house-format picker; clicking the completion ring MUST complete/reopen the task without opening the modal.
- **REQ-005 — Slash creation:** Typing `/task <title>` and pressing Enter MUST create one task using selected-day defaults and replace the command line with a task-reference block at the same document position. Failure MUST preserve/recover the title and offer retry without creating duplicates.
- **REQ-006 — Day history:** Switching days MUST flush pending edits before hydration, load that date's document, keep completed historical task references, and never show the previous day's content during loading.
- **REQ-007 — Desktop visual density:** Desktop MUST use a compact day header and Motion-like task density: day title `48–56px`, date `16–18px`, section headings `26–30px`, task title `17–19px`, metadata `15–17px`, a `20–22px` completion ring inside at least a `40px` hit target, and no boxed task cards.
- **REQ-008 — Timeline:** The right panel MUST retain a 24-hour one-day timeline, date navigation, current-time marker, automatic useful scroll position, and clickable canonical task blocks; it MUST share the selected day with the document.
- **REQ-009 — Responsive behavior:** Tablet and mobile MUST keep a single-column daily document, native-safe scrolling, usable bottom navigation/safe areas, compact typography, and no horizontal overflow. The desktop timeline MAY be hidden below the desktop breakpoint.
- **REQ-010 — States and themes:** Loading, empty, saving, saved, error, offline/retry, and partial-task-load states MUST be legible in both themes using existing tokens, without glow, blur, or a second surface color.
- **REQ-011 — Accessibility and motion:** All controls MUST have accessible names, keyboard focus, `44px` touch targets on phone, reduced-motion behavior, and no page-level layout jump while task/editor data hydrates.
- **REQ-012 — Workstream isolation:** The change MUST NOT alter the main Calendar screen or app sidebar. Shared `TaskModal`, global tokens, and task-store changes are allowed only when unavoidable and must remain backward-compatible.

## Experience Contract

### Wide desktop (>=1280px)

- Preserve the app sidebar.
- The remaining width uses `0.96fr / 1.04fr`; the timeline is visibly but only slightly wider.
- The document has a centered readable measure with responsive horizontal padding, but its click target extends through the full pane.
- The day header is centered and compact enough that useful content begins above the fold.
- Prose and task-reference blocks share one vertical flow. Task rows are flat typography, not cards.
- The timeline owns its own vertical scroll; the document owns its own scroll. Changing the selected date updates both atomically.

### Tablet and mobile

- Show the document only; do not squeeze a second column.
- Keep the phone day header and gestures, but use desktop-only typography overrides instead of scaling the phone layout upward.
- Preserve safe-area padding and stable bottom-nav clearance.

### Primary journey

1. Open Today and see the selected day without an old-content flash.
2. Click anywhere in the document and write; autosave reports quiet state changes.
3. Type `/task Prepare report`, press Enter, and see a real task row at the caret.
4. Change its date/duration inline, open it by title, or complete it from the ring.
5. Move to another day and back; prose, ordering, task references, and completion history remain correct.

### State behavior

- **Loading:** stable document/timeline skeleton; editor disabled until the correct day hydrates.
- **Empty:** editable placeholder and optional short `/task` hint; no large empty-state illustration.
- **Saving/saved:** quiet inline state; “Saved” fades but remains available to assistive tech.
- **Error/offline:** retain local editor content, show retry, and do not overwrite newer local edits with a late response.
- **Partial task load:** preserve task-reference position with a compact unavailable/retry row rather than deleting it.
- **Reduced motion:** task reordering/fades become immediate; no auto-animation-induced layout shift.

## Design Contract

- Reuse semantic tokens and shared `DatePicker`, `Popover`, `BottomSheet`, and `TaskModal` patterns from `design-refs/ui-conventions.md`.
- Use one continuous `--surface-canvas`/ambient background and hairline divider between document and timeline.
- Desktop header: serif display face already exposed by `needt-day-display`, capped at `56px`; mobile remains near `44px`.
- Task row: `17–19px` title, `15–17px` inline metadata, `30–34px` visual line, at least `40px` pointer target, `20–22px` completion ring.
- Section spacing: headings `26–30px`, roughly `40–48px` between sections; prose uses an 18px desktop base with a readable line height.
- Timeline: compact `88–92px` header, `72px` hour rows, `12px` labels, task blocks at `12–13px`; no glow/blur.

## Engineering Contract

### Component boundary

- Keep `TodayView` as orchestration (selected date, stores, modal/sheet state).
- Extract the document and timeline into Today-owned components so layout work does not keep expanding one file.
- Add a Tiptap block node with the serialized contract:
  - `<div data-type="taskReference" data-task-id="TASK_ID"></div>`
  - Only the task ID is persisted; task fields come from `useTaskStore`.
- Extend daily-agenda sanitization only for the exact task-reference element/attributes. Unknown tags/attributes remain stripped.

### Reconciliation invariants

- A selected-day task that is not already referenced is appended once to the appropriate generated task section.
- Duplicate references to the same task ID in one agenda are collapsed deterministically.
- Completed references are retained for historical days.
- An incomplete task moved away from a day is removed from that day's generated section; explicit prose is never rewritten.
- Deleting a task-reference block removes only the agenda reference, not the canonical task.

### Persistence and failure handling

- Retain `DailyAgenda.content` and existing rows; no schema migration is required.
- Debounced saves carry the date key/version they were created for. Date navigation first flushes or queues that save, then hydrates the next day.
- Abort stale GET requests and ignore responses for a no-longer-selected date.
- A failed task create keeps a recoverable command block; retry is user-driven and idempotent within the editor action.
- API validation remains per-user, date-keyed, size-limited, and sanitized.

### Simpler alternative considered

Keep prose in the small editor and render all tasks in fixed React sections below it. This avoids a custom Tiptap node but cannot satisfy the requested Notes-like single canvas or keep a `/task` result at the cursor, so it is rejected.

## Execution Graph

- **Wave 1:** editor/task-reference contract and API sanitization (`T-001`–`T-003`).
- **Wave 2:** document composition, task interactions, split layout, timeline, responsive states (`T-004`–`T-007`).
- **Wave 3:** focused regressions, visual evidence, changelog, and targeted gates (`T-008`–`T-010`).

## Verification Matrix

| Requirement               | Unit/integration                    | UI/e2e                                          | Manual evidence                                |
| ------------------------- | ----------------------------------- | ----------------------------------------------- | ---------------------------------------------- |
| REQ-001, REQ-007, REQ-008 | n/a: visual composition             | Today desktop visual test                       | 2048px dark/light screenshot beside references |
| REQ-002, REQ-005, REQ-006 | editor serialization/autosave tests | write, `/task`, navigate away/back, reload      | persisted daily canvas recording               |
| REQ-003, REQ-004          | task-reference reconciliation tests | complete/date/duration/open modal               | Calendar and Today show same task state        |
| REQ-009, REQ-011          | n/a: viewport behavior              | tablet/mobile visual + keyboard/touch scenarios | installed-PWA phone smoke                      |
| REQ-010                   | API error/stale-response tests      | loading/error/retry theme scenarios             | no content loss during simulated offline save  |
| REQ-012                   | targeted diff review                | Calendar smoke remains unchanged                | Calendar chat reports no shared-file conflict  |

## Rollout and Recovery

- Land as one Today-owned block after targeted tests and visual review; deploy only with the associated code change, not as a planning-only release.
- Existing agenda HTML remains readable. If task-reference rendering fails, show a recoverable placeholder and leave stored content untouched.
- Rollback is code-only because storage stays backward-compatible. Do not delete `DailyAgenda` rows or rewrite migration history.

## Open Decisions

None. The requested Motion/Notes behavior is treated as approval for inline task-reference blocks and the 48/52 desktop split.
