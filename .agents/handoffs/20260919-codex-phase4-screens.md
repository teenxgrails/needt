---
id: 20260919-codex-phase4-screens
owner: codex
branch: codex/design-completion
status: active
updated: 2026-09-21T10:30:00Z
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

## Working state

- Files currently being edited for the first screen: `/today` route, the ported `needt/home` data/interaction boundary, habit-completion service/API, tests, changelog, UI contract gate, and this handoff.
- Foreign changes that must remain untouched: all 41 pre-existing untracked paths reported by `npm run agent:context`, including design bundles, landing sources, `pf-sync/`, root `pnpm-lock.yaml`, and dim/paper visual baselines.

## Verification

- Passed: `npm run type-check`; focused suites after audit fixes; full `npm run test:unit` (197 suites, 1294 tests, one skipped); `npm run lint`; `npm run tokens:check`; `npm run check:ui-contracts`; `npm run check:branding`; `npm run check:agent-handoffs`; `npm run build`; `npm run build:worker`; `git diff --check`.
- ESLint now ignores `.claude/**`, which contains independent 622 MB worktrees and previously exhausted the root lint process; no lint rule or source path was suppressed.
- Browser visual inspection at desktop/390/360 remains blocked: Docker Desktop reports its engine running in the UI, but the CLI returns `Docker Desktop is unable to start`, so `npm run db:up` cannot start the local database. No migration was run and Neon was not touched.

## Decisions and constraints

- The screen fetches after `WorkspaceProvider` has selected a workspace. Its fetch interceptor adds `x-workspace-id`, and `authenticateRequest` re-authorizes membership server-side; no cookie bridge or request-trusted scope was added.
- Production routes must pass real Prisma-backed data explicitly so fixture defaults remain preview-only.
- Production exposes only Today form until Prose/Canvas have a real persistence model; fake `BRIEF_SEED` content must never appear as user data.
- Habit completion is an idempotent user-timezone operation on the existing `(habitId, date)` unique key. Habit reads retain the existing per-user ownership rule inside the authorized workspace.
- One writer owns this checkout; subagents are read-only auditors.

- Calendar gates (2026-09-21): type-check; full unit (199 suites, 1295 tests, one skipped); scoped eslint on every changed file; tokens, UI contracts, branding, handoff checks; `npm run build` with loopback DB URLs + artifact check; `npm run build:worker`; visual `calendar-production` (2/2) and `schedules-flexible-hours` on desktop against the isolated `127.0.0.1:5433/needt_test`. Calendar screenshot baselines were not refreshed.

## Blockers

- PRs #37, #24 and #41 are still open, so the owner-requested rebase wave cannot start yet.

## Next action

- Next screen: `/tasks` and `/projects`. Calendar visual baselines need the CI baseline-refresh flow.
