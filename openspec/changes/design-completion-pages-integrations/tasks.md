# Tasks

## Data and APIs

- [x] Add additive Pages, database, proposal, integration and bug-report models/migration.
- [x] Add Pages/database/query/revision services and authenticated APIs.
- [x] Enforce private-tree AI exclusion and proposal-only writes.
- [x] Add safe formula parser and privacy/formula regression tests.

## Product surfaces

- [x] Replace Boards navigation/routes/tools with Pages without deleting legacy data.
- [x] Add document editor, local drafts, save states, undo/redo and database view shell.
- [x] Recompose Today document/timeline, mobile calendar sheet and explicit evening review.
- [x] Remove Calendar selected ring and use priority/calendar color rails.
- [x] Make Settings switching immediate and Appearance autosave.
- [x] Add integration catalog and Report a bug form.

## Operations and verification

- [x] Add BullMQ GitHub issue retry for reports.
- [x] Replace Docker Hub workflow with gated GHCR/Coolify workflow.
- [x] Pass lint, type-check, unit tests, app build and worker build.
- [x] Apply the full migration history to a clean PostgreSQL container.
- [x] Run/update authenticated Playwright and visual baselines for all states.
- [x] Run Docker multi-stage build locally.

## Second pass — P0 Settings and themes

- [x] Group desktop Settings navigation into Planner, Preferences, Connections and Account and pin Report a bug in a fixed footer.
- [ ] Normalize Notifications, API, Privacy, AI Assistant, Account and Billing into compact shared-control rows.
- [x] Add Gray for the existing graphite palette and make Dark/System dark use the `#0E0E10` palette.
- [x] Stop applying `backgroundTint` as a global theme override while retaining the stored compatibility field.
- [ ] Add focused settings/theme regression coverage and update Light, Gray and Dark visual baselines.

## Second pass — P0 Schedules and flexible hours

- [x] Add additive WorkSchedule, schedule-window, task/recurring assignment and FlexibleHoursOverride persistence.
- [x] Materialize existing work hours as the default `Work Hours` schedule without rewriting migration history.
- [x] Resolve each task's selected/default schedule in the deterministic scheduler while preserving all other scheduling rules.
- [x] Build create/edit/delete/default schedule flows with multiple intervals, 15-minute move/resize, precise time input and selected-day copy.
- [x] Replace Task/Event day blocking with flexible-hours overrides and migrate/hide legacy `[NEEDT_DAY_BLOCK]` events.
- [x] Render one-off overrides as diagonal calendar availability texture.
- [x] Add unit and E2E coverage for schedule selection, recurring tasks, overrides, copy/resize and legacy migration.

## Second pass — P0/P1 Pages

- [x] Reconcile versioned PageBlocks by stable ID and revision snapshot instead of replacing one HTML paragraph.
- [x] Add borderless title, icon, cover, click-to-focus and searchable slash-menu editing.
- [x] Support text, H1–H3, lists, checklist, quote, callout, toggle, code, divider, links, bookmarks, files/images, tables, columns and page/date mentions.
- [x] Add private PageAsset uploads, resolvable comments, saved templates and authenticated forms.
- [x] Complete Table, Board, List, Calendar, Timeline and Gallery database views with record/property CRUD, filters, sort and grouping.
- [x] Expose AI page-change diffs and explicit accept/reject using the existing proposal model.
- [x] Add regression/E2E coverage for blocks, assets, comments, templates, forms, database views and AI review.

## Second pass — P0/P1 Today and Calendar

- [x] Share the Pages document contract with Today-specific task and task-group nodes.
- [x] Allow document blocks between dynamic task groups and match Motion Agenda density.
- [x] Make center document and right timeline independently scrollable without desktop page scrolling.
- [x] Add 15-minute task drag/resize in Today using calendar-drag semantics and pin manual placements.
- [x] Preserve mobile sheet, drafts, save status and explicit evening review.
- [x] Span the current-day pill across weekday/date and show day actions only on hover/focus.
- [x] Open Create Task directly from calendar `+` and select Event within the shared editor.
- [x] Align Task editor grid/dividers and rebuild Event mode with the same shell, rich editor, pickers and footer.
- [x] Add regression/E2E coverage for Today drag/resize and scroll, calendar texture, direct Task creation and Task/Event parity.

## Second pass — P1/P2 Integrations and verification

- [ ] Add open-source icons for Google Calendar, Outlook, Apple/iCloud, Needt API and Composio.
- [ ] Audit Settings and editor overlays, selects, comboboxes, date/time pickers and dialogs against house conventions.
- [ ] Update CHANGELOG and desktop/tablet/mobile visual baselines for Light, Gray and Dark.
- [ ] Pass lint, type-check, unit, worker build, app build, clean ephemeral migration history, Playwright/visual and Docker checks.
