---
id: 20260810-codex-design-completion
owner: codex
branch: codex/design-completion
status: active
updated: 2026-08-10T14:28:14Z
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

## Working state

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

## Verification

- Passed: `npx prisma validate`, `npm run type-check`, `npm run lint`, full
  `npm run test:unit` (125 suites, 640 tests; one suite/test skipped),
  `npm run check:branding`, `npm run check:ui-contracts`, `npm run build`,
  `npm run build:worker`, `npm run build:collaboration`, collaboration runtime
  check, and `git diff --check`.
- Build caveat: Next completed successfully but logged that static generation
  could not reach the configured remote Neon database.
- Passed: full E2E with one worker (24 passed, three credential-gated skips),
  style (15 passed), and production visual (65 passed, four breakpoint-gated
  skips). The visual suite passed again without updating snapshots.
- Yjs duplicate-import warning found in E2E is fixed by externalizing Yjs from
  Next server route bundles; targeted Pages E2E passes without the warning.
- Still required for S5 green: production Docker image build and deploy/smoke.

## Decisions and constraints

- Do not start S5 before Terra T1-T4; they are complete.
- The project-scoped `needt-critique` review is complete; its actionable
  blockers were returned to S1/S3/T4 and addressed without unrelated polish.
- Keep milestones in separate commits and continue by dependency order.
- Run visual regression with `NEEDT_VISUAL_PRODUCTION_SERVER=1`; the dev server
  exhausts memory during the full 69-test matrix.

## Blockers

- Docker Desktop is running, but two production-image attempts failed before
  reading project files because Docker Hub timed out loading metadata for
  `node:22-alpine3.19` after 60 seconds (`DeadlineExceeded`).

## Next action

- Commit the visual hardening/baselines, retry the production Docker build when
  Docker Hub is reachable, then deploy/smoke-test. Do not start S6 until S5 is
  green and smoke-tested.
