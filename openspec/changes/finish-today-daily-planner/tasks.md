# Tasks

## Wave 1 — Stable document contract

- [x] **T-001 — Split Today ownership cleanly** (REQ-001, REQ-008, REQ-012)
  - Extract Today-owned document/timeline components from `src/components/today/TodayView.tsx` without changing the app sidebar, main Calendar route, or shared Task modal behavior.
  - Completion: `TodayView` owns data/orchestration; extracted components own rendering and have explicit typed props.

- [x] **T-002 — Add canonical task-reference blocks** (REQ-003, REQ-005, REQ-006)
  - Implement a Tiptap task-reference extension/NodeView under `src/components/today/` using only `taskId` serialization.
  - Update `src/app/api/daily-agenda/route.ts` sanitization for the exact node contract and add tests for accepted task references plus rejected unsafe markup.
  - Completion: task references round-trip without copying title/date/duration/status into agenda content.

- [x] **T-003 — Make per-day persistence race-safe** (REQ-002, REQ-006, REQ-010)
  - Refactor `DailyAgendaEditor` hydration/debounce/flush behavior so stale GET/PUT work cannot overwrite another day or newer local content.
  - Preserve local content on save failure and expose retry.
  - Completion: rapid previous/next navigation plus reload restores the correct text for every date.

## Wave 2 — User-facing Today composition

- [x] **T-004 — Build one Notes-like daily canvas** (REQ-002, REQ-003, REQ-005, REQ-007)
  - Make the full document pane editable and compose prose, headings, lists, and task-reference blocks in one flow.
  - Reconcile missing/duplicate/moved/completed task references according to `design.md` without mutating canonical task data.
  - Completion: existing selected-day tasks appear once and `/task title` leaves a task row at the command position.

- [x] **T-005 — Finish Motion-like task rows and actions** (REQ-003, REQ-004, REQ-007, REQ-011)
  - Apply the desktop typography/control metrics from the design contract.
  - Preserve independent title/date/duration/completion targets and shared popup/modal styling.
  - Completion: title opens Edit Task; date/duration update inline; completion does not trigger another action; keyboard and touch targets pass.

- [x] **T-006 — Recompose desktop document and timeline** (REQ-001, REQ-007, REQ-008)
  - Replace the capped timeline grid with the 48/52 split, compact the desktop day header, align pane headers/divider, and keep independent stable scrolling.
  - Completion: at 1440px and 2048px the timeline is slightly wider, neither pane clips, and useful document content is visible above the fold.

- [x] **T-007 — Finish tablet/mobile and all UI states** (REQ-009, REQ-010, REQ-011)
  - Keep a single-column document below desktop, safe-area spacing, reduced motion, and explicit loading/empty/error/offline/partial-task states in both themes.
  - Completion: 768x1024 and 375x812 have no horizontal overflow, covered content, or layout jump.

## Wave 3 — Evidence and handoff

- [ ] **T-008 — Add focused Today regression tests** (REQ-002–REQ-006, REQ-010)
  - Add unit/integration coverage for sanitizer, task-reference reconciliation, autosave/date races, create failure/retry, and historical completion behavior.
  - Run targeted Jest files only during iteration.

- [ ] **T-009 — Add Today-only Playwright evidence** (REQ-001, REQ-004, REQ-007–REQ-011)
  - Add/update a Today-focused visual/e2e spec for desktop/tablet/mobile in dark/light plus the write, `/task`, date, duration, complete, modal, history, reload, and error flows.
  - Commands: `pnpm test:visual -- --project=desktop <today-spec>`, then tablet/mobile after desktop is accepted.
  - Completion: screenshots match the user references in hierarchy/density and all interactions persist.

- [ ] **T-010 — Targeted gate and release note** (REQ-001–REQ-012)
  - Run only the proportional gate requested for this block: targeted Jest, `pnpm type-check`, Today visual/e2e, and `pnpm lint` if the repo lint command is operational.
  - Update `CHANGELOG.md` under `[Unreleased]`, keep `.project-pilot` current, and review the diff for Calendar/sidebar/shared-file leakage.
  - Completion: no known high/medium Today defect; planning-only files ship with the actual Today code rather than triggering their own deployment.
