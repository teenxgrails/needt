---
id: 20260919-codex-phase4-screens
owner: codex
branch: codex/design-completion
status: active
updated: 2026-09-24T17:14:39Z
objective: Replace the five legacy product screens in place with the ported Needt screens, real server data, and no parallel variants.
---

## Scope

- Governing plan/spec: launch GOAL Phase 4; `/Users/lol/Needt-handoff/2026-09-15-docs-refresh/files/docs/handoff/CODEX-NEXT.md` §6; `docs/handoff/PORT.md` §0, §6 and §8.
- In scope: `/today`, `/calendar`, `/tasks` and `/projects`, `/pages` list, `/settings`; one screen per commit; delete each replaced legacy tree in the same commit.
- Out of scope: production, deploy, Neon, protected-branch pushes, PR merges, landing, visual baseline refresh, and changes to the binding PORT sections.

## Completed

- Phase 3.6 is pushed as draft PR #42; its local `.next` is removed and Docker Desktop is stopped.
- Re-read the current external CODEX-NEXT §6 and binding PORT sections before Phase 4 edits.
- Replaced `/today` with the ported Home/MobileHome production binding. Real tasks, projects and habits come from an authenticated workspace-scoped API; task/habit changes persist; Viewer access is read-only; unfinished Prose/Canvas fixture content is unavailable in production.
- Bound each Today response to the server-authorized workspace so an in-flight response cannot overwrite the screen after a workspace switch.
- Made scheduling wait for its queued run to succeed, serialized repeated task/habit toggles, and rendered task dates in the user's timezone rather than the container timezone.
- Deleted the complete legacy `src/components/today/**` tree and its external unit test; migrated Today visual assertions to the new production contract.
- Today committed as `cc5fd41` + `5663b23` (real project metadata) and pushed to draft PR #34.
- Calendar (2026-09-21, finished by Claude while Codex was rate-limited): replaced the FullCalendar route with the ported Needt views over `/api/needt/calendar`; split blocks, own events and opaque Busy intervals; Viewer mutations refused server-side; whole-day flexible-hours guard; FullCalendar packages, CSS and legacy `src/components/calendar/**` deleted.
- Moved `tests/calendar-production.spec.ts` to `tests/visual/` (it needs the visual seed user; under the e2e config it could never pass) and scoped flexible-hours selectors to `:visible` because the phone Day view stays in the DOM, hidden by CSS, on desktop.
- Replaced both `/tasks` and `/projects` with the ported Workspace List, Kanban and Flow over `/api/needt/workspace`; desktop and phone read the same real tasks, projects and workspace members, and Viewer controls are absent while server authorization remains authoritative.
- Removed the legacy `src/components/tasks/**` and `src/components/projects/**` trees. The task editor, focus timer/description and navigation Today panel still used by other product routes were relocated to owned shared directories rather than deleted with the old screens.
- Editors keep the full production task editor, including scheduling, recurrence, dependencies, time tracking, labels and archive; Viewers get the ported read-only task detail. Workspace selection also bootstraps the shared task/tag/project stores so Focus and navigation consumers do not empty after a switch.
- `/projects` keeps project creation, rename, archive and restore in a compact manager over the ported Workspace; legacy List/Kanban/Gantt, template and health-journal presentation stays deleted because the port owns List/Kanban/Flow and PORT marks stage/blocker editing out of scope.
- Added server Editor gates to every task/tag mutation reachable from the retained editor and workspace-scoped `start-now` and time-tracking task lookup. Production port controls without persistence stay hidden or read-only.
- Replaced only the `/pages` list with the ported Documents screen while retaining the Page editor, navigation tree and APIs. The new route reads workspace-authorized Pages through `prismaDataSource`, guards stale workspace responses, and persists search/filter, Page/database creation, favorite and trash actions through existing APIs; fixture data remains preview-only.
- Preserved folders, tags and saved filters, removed the unimplemented Import control, added keyboard-open semantics, and hid all document mutation controls from Viewers.
- Closed three retained-editor Viewer write holes found during the A.2 audit: old comment authors cannot mutate after downgrade or workspace loss, proposal rejection now needs workspace and Page Editor access, and a Viewer cannot copy a shared Page into a personal template.
- Removed the test-only `__internal` export from the Calendar route after generated Next route typings correctly rejected the extra route-module export; runtime behavior is unchanged.
- Replaced the legacy Settings shell with the ported nine-section Settings screen while retaining the real production panels, all historical hash aliases, Report Bug access, the launch pricing/trial contract, and account export/deletion integration points. Numeric hosted-AI usage is no longer rendered.
- Removed the public `/design-preview` route, its middleware exception, and the now-orphaned fixture compositor after every ported product screen was mounted in place.
- Repaired the Phase 4 browser contracts reported by PR #34 CI: scoped duplicate Documents/project/task locators, updated the renamed Settings Provider heading, and aligned the non-admin redirect assertion with middleware's `/` destination.

## Working state

- Phase A is complete and pushed through A.4. The tracked working scope is the E2E contract repair for PR #34 plus this handoff; Phase B is blocked on visual-spec selector repair before CI can persist Linux baselines.
- Foreign changes that must remain untouched: all 41 pre-existing untracked paths reported by `npm run agent:context`, including design bundles, landing sources, `pf-sync/`, root `pnpm-lock.yaml`, and dim/paper visual baselines.

## Verification

- Passed: `npm run type-check`; focused suites after audit fixes; full `npm run test:unit` (194 suites, 1261 tests, one skipped); `npm run lint`; `npm run tokens:check`; `npm run check:ui-contracts`; `npm run check:branding`; `npm run check:agent-handoffs`; `npm run build`; `npm run build:worker`; `git diff --check`.
- ESLint now ignores `.claude/**`, which contains independent 622 MB worktrees and previously exhausted the root lint process; no lint rule or source path was suppressed.
- Browser visual inspection at desktop/390/360 remains blocked: Docker Desktop reports its engine running in the UI, but the CLI returns `Docker Desktop is unable to start`, so `npm run db:up` cannot start the local database. No migration was run and Neon was not touched.

## Decisions and constraints

- The screen fetches after `WorkspaceProvider` has selected a workspace. Its fetch interceptor adds `x-workspace-id`, and `authenticateRequest` re-authorizes membership server-side; no cookie bridge or request-trusted scope was added.
- Production routes must pass real Prisma-backed data explicitly so fixture defaults remain preview-only.
- Production exposes only Today form until Prose/Canvas have a real persistence model; fake `BRIEF_SEED` content must never appear as user data.
- Habit completion is an idempotent user-timezone operation on the existing `(habitId, date)` unique key. Habit reads retain the existing per-user ownership rule inside the authorized workspace.
- One writer owns this checkout; subagents are read-only auditors.
- Trial state, account deletion and account export remain dependencies on PRs #39 and #40; this screen mirrors their UI contracts without duplicating their backend lifecycle.

- Calendar gates (2026-09-21): type-check; full unit (199 suites, 1295 tests, one skipped); scoped eslint on every changed file; tokens, UI contracts, branding, handoff checks; `npm run build` with loopback DB URLs + artifact check; `npm run build:worker`; visual `calendar-production` (2/2) and `schedules-flexible-hours` on desktop against the isolated `127.0.0.1:5433/needt_test`. Calendar screenshot baselines were not refreshed.
- Workspace A.1 (2026-09-24): `npm run type-check`; `npm run lint`; full unit (194 suites, 1261 tests, one skipped); `npm run tokens:check`; UI contracts; branding; handoff check; `npm run build` with explicit loopback DB URLs (146 pages, artifact check passed); `npm run build:worker`; `git diff --check`; Playwright lists the replacement workspace journey at desktop, 360px and 390px and the updated visual specs without compile errors.
- The workspace browser journey was not executed locally because its global setup would restart the intentionally stopped Docker E2E stack and apply migrations. No migration ran, no container was recreated, and Neon was not touched. Linux CI remains the runtime authority for this checkpoint.
- Documents A.2 (2026-09-24): `npm run type-check`; `npm run lint`; full unit (196 suites, 1267 tests, one skipped); 6 focused authorization/API assertions; tokens, UI contracts, branding and handoff checks; `npm run build` with explicit loopback DB URLs (147 pages, artifact check passed); `npm run build:worker`; `git diff --check`; Playwright lists the editor journey plus 360px and 390px Viewer journeys without compile errors. A 5.6 Terra read-only final diff review returned no actionable findings.
- The Documents browser journey was not executed locally because it would restart the intentionally stopped Docker E2E stack and apply migrations. No migration ran, no container was recreated, and Neon was not touched. Linux CI remains the runtime authority for this checkpoint.
- Settings A.3: `npm run type-check`; `npm run lint`; full unit (196 suites, 1270 tests, one skipped); 14 focused settings registry/search/pricing/AI-privacy assertions; tokens, UI contracts, branding, handoff and diff checks; production build with explicit loopback DB URLs (147 pages, artifact check passed); worker build; Playwright lists the desktop billing journey and 360px/390px section/overflow journeys. A 5.6 Sol/Terra read-only review found and closed seven missing legacy hash aliases; the trial backend remains correctly owned by PR #39.
- The Settings browser journey was not executed locally because its standard setup would restart the intentionally stopped Docker stack and apply migrations. The production build did not connect to Neon, no migration ran, and `.next` was removed immediately after the build.
- Preview removal A.4: type-check; lint; full unit (196 suites, 1271 tests, one skipped); focused middleware regression (2 assertions); tokens, UI contracts, branding, handoff and diff checks; production build with explicit loopback DB URLs (146 pages, no `/design-preview`, artifact check passed); worker build. `.next` was removed immediately after the build.
- PR #34 E2E repair: type-check; lint; full unit (196 suites, 1271 tests, one skipped); tokens, UI contracts, branding, handoff and diff checks; production build (146 pages, artifact check passed); worker build; Playwright lists all 11 affected tests without compile errors. Runtime execution remains CI-owned because Docker is intentionally stopped.

## Blockers

- PRs #37, #24 and #41 are still open, so the owner-requested rebase wave cannot start yet.
- Owner decision on outside contacts is still open. A.1 uses workspace members for holder/waits-on data and keeps the existing `//todo` seam in `prisma-source.ts`.
- Linux-baseline run 36031058057 failed before its commit step: 22 visual tests use stale or ambiguous selectors after the in-place screen replacements. No output branch, commit or artifact was created; the 12 existing untracked dim/paper snapshots are foreign and remain untouched.

## Next action

- Commit and push the E2E contract repair to draft PR #34, confirm CI, then repair the seven failing visual specs and rerun the Linux baseline workflow. Review every generated PNG before accepting it.
