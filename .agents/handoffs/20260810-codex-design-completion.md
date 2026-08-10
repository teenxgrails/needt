---
id: 20260810-codex-design-completion
owner: codex
branch: codex/design-completion
status: active
updated: 2026-08-10T19:11:36Z
objective: Complete the dependency-ordered design completion plan after Terra T1-T4
---

## Scope

- Governing plan/spec: `docs/plans/07-sol-high.md` and
  `docs/plans/08-terra-high.md`.
- In scope: preserve the completed Terra prerequisites, establish durable
  multi-agent handoff, then resume at S5 through the documented dependencies.
- Out of scope: unrelated product changes and user-owned dirty files.

## Completed

- S1 `328c5b0`, S2 `e25f7e6`, S3 `d454be6`, S4 `adbedf2`.
- Terra T1 `8760953`, T2 `71f7d79`, T3 `7411b53`, T4 `90d2720`.
- Project Hallmark `4a79c58`; Needt critique skill `679af84`.
- S5 blocker fixes: auth/workspace scheduling `b0dfa1c`, offline replay
  `2f32f4f`, stale T4 contract test `962d3eb`, and duplicate Yjs prevention
  `35f6a26`.
- Visual production baselines and deterministic fixtures `a34f4b9`.
- Production image/runtime hardening `f2a6959`: auth initialization is deferred
  to runtime, session-dependent pages are dynamic, and the entrypoint fails
  immediately when environment validation or migrations fail.
- PR #16 release review fix `d4a9fc9`: a pre-column compatibility trigger keeps
  the fallback writer working through the workspace dependency migration,
  Prisma schema drift is zero, and production deployment now fails closed and
  waits for the exact healthy web SHA before worker/collaboration rollout.
- PR #16 CI follow-up is in progress: hard-coded collaboration test keys were
  replaced with ephemeral keys, restored `/task` commands now retry ahead of
  the slash menu, and visual snapshots are being split by host platform.
- The Dockerfile now has a dedicated `collaboration` runtime target: it builds
  `dist/collaboration`, carries the Prisma runtime, and starts the Hocuspocus
  server through the shared entrypoint.

## Working state

- `Dockerfile` and this handoff have an uncommitted scoped collaboration-image
  change; no user-owned dirty files are part of it.
- The S5 adversarial review is complete. Blockers found in S1/S3/T4 are
  committed: production auth now fails closed, scheduling runs and connector
  reschedules are workspace-scoped, offline replays are idempotent and
  revision-aware, and the stale companion contract test matches the shipped UI.
- The production visual suite is deterministic after resetting settings for
  every fixture, suppressing the timed companion intro, sorting loose Space
  tasks by date/ID, and aligning stale Pages/theme assertions. Reviewed
  production baselines are committed in `a34f4b9`.
- Preserve existing user changes in `docs/plans/README.md`,
  `src/app/layout.tsx`, `.playwright-mcp/`, `docs/plans/08-terra-high.md`, and
  `pages-mobile-slash-390.png`.
- The local production image `needt:s5-smoke` builds without build-time auth
  secrets. Against a clean PostgreSQL 16 container it applied all 85 migrations,
  started Next.js, and returned `{ok:true,db:"ok"}` from `/api/health`.

## Verification

- Passed: `npx prisma validate`, `npm run type-check`, `npm run lint`, full
  `npm run test:unit` (125 suites, 641 tests; one suite/test skipped),
  `npm run check:branding`, `npm run check:ui-contracts`, `npm run build`,
  `npm run build:worker`, `npm run build:collaboration`, collaboration runtime
  check, and `git diff --check`.
- Build caveat: Next completed successfully but logged that static generation
  could not reach the configured remote Neon database.
- Passed after production hardening: full unit (125 suites, 641 tests; one
  suite/test skipped), full E2E with one worker (24 passed, three
  credential-gated skips), type-check, lint, targeted Docker/auth tests, the
  production Docker build, and the clean-database runtime smoke test.
- Passed after PR #16 review fixes: Prisma validate/generate, zero schema drift,
  86-migration clean-database deploy plus legacy-writer SQL smoke, type-check,
  lint, branding/UI contracts, full unit (126 suites, 644 tests), full E2E (24
  passed, three credential skips), app/worker/collaboration builds, runtime
  identity check, and production Docker build.
- Previously passed: style (15 passed) and production visual (65 passed, four
  breakpoint-gated skips). The visual suite passed again without updating
  snapshots.
- Yjs duplicate-import warning found in E2E is fixed by externalizing Yjs from
  Next server route bundles; targeted Pages E2E passes without the warning.
- Still required before S6: deploy this hardening through the authorized
  production workflow and run the production smoke/release gate.
- Targeted collaboration tests, type-check, lint, and the Today failed-create
  retry visual scenario pass after the CI follow-up changes.
- Passed after the collaboration image change: `docker build --target
  collaboration --tag needt:collaboration-smoke .`, an isolated collaboration
  container smoke run with a temporary PostgreSQL dependency, and `npm run
  check:collaboration-runtime`.

## Decisions and constraints

- Do not start S5 before Terra T1-T4; they are complete.
- The project-scoped `needt-critique` review is complete; its actionable
  blockers were returned to S1/S3/T4 and addressed without unrelated polish.
- Keep milestones in separate commits and continue by dependency order.
- Run visual regression with `NEEDT_VISUAL_PRODUCTION_SERVER=1`; the dev server
  exhausts memory during the full 69-test matrix.

## Blockers

- GitHub repository and `production` environment currently expose no configured
  secret names. Coolify web/worker/collaboration hooks, production health URL
  and rollback hook must be configured before merge or the fail-closed deploy
  job will stop. A current production backup must also be verified.

## Next action

- Commit and push the dedicated collaboration image target, wait for green CI,
  then configure the required production secrets and verify a current backup
  before merging and monitoring the production rollout/smoke.
