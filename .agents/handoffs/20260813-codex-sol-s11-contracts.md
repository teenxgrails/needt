---
id: 20260813-codex-sol-s11-contracts
owner: codex
branch: codex/sol-s11-contracts
status: blocked
updated: 2026-08-13T22:00:37Z
objective: Complete the local Sol S11 product contracts and final S12 review without production operations.
---

## Scope

- Governing plan/spec: `docs/plans/07-sol-high.md` S11-S12.
- In scope: capacity/explanations/what-if, scoped Saved Views, project health, habits/focus targets, meeting-note approval proposals, additive migrations, API/services/docs/tests.
- Out of scope: Terra UI/design, deploy/push/PR, production smoke, new AI scheduler, seat billing, cross-workspace views, third-party document storage, physical deletion.

## Completed

- Implemented S11.1-S11.5: privacy-safe capacity and stale-safe reversible previews; versioned scoped Saved Views; project health history/versioning; deterministic habit occurrences and workspace Focus targets; approval-only meeting-note task/schedule proposals.
- Scoped implementation commit: `a180003` (`feat: add Sol S11 product contracts`).
- Added four additive migrations, contract docs, changelog entry and focused contract/migration tests.
- S12 review found and fixed workspace-Viewer proposal approval, stale preview context, Saved View board re-scoping and Page-list authorization gaps. No unresolved code-level P0/P1 was found in the S11 diff.

## Working state

- Files currently dirty or expected to change: all S11 files are ready for the scoped commit; generated `.next/cache` was removed after an `ENOSPC` build failure and is recoverable.
- Foreign changes that must remain untouched: `.codex/config.toml`, `CLAUDE.md`, `docs/plans/README.md`, `src/app/layout.tsx`, `.playwright-mcp/`, `NEXT_AGENT.md`, `docs/plans/08-terra-high.md`, `pages-mobile-slash-390.png`.

## Verification

- Passed: Prisma format/validate/generate; `npm run type-check`; `npm run lint`; `npm run test:unit` (141 suites/681 tests) plus focused re-run; branding/UI/handoff checks; `npm run build`; `npm run build:worker`; `npm run build:collaboration`; `git diff --check`.
- Not run / still required: E2E/style/visual and production Docker build are blocked by the local Docker/Desktop + existing-dev-server environment. Production smoke/deploy remains intentionally out of scope.

## Decisions and constraints

- Work locally and economically; defer all validation commands until S11.1-S11.5 implementation is complete.
- Extend existing contracts where present and avoid user-visible design changes.
- Production smoke is explicitly deferred and is not required for this local implementation pass.

## Blockers

- Docker Desktop stopped responding after local disk exhaustion. E2E/visual initially failed with Docker unavailable, then a shared Compose race from a parallel attempt; after freeing `.next/cache`, `docker info`/`docker version` still hang. Style/E2E dev-server attempts also hit `EMFILE` because an existing user-owned Needt dev server on `:3000` must not be killed. Production-server modes are configured for the retry.

## Next action

- After Docker Desktop is healthy, run sequentially: `PORT=3100 TEST_BASE_URL=http://127.0.0.1:3100 NEEDT_E2E_PRODUCTION_SERVER=1 npm run test:e2e`; then style/visual with `NEEDT_VISUAL_PRODUCTION_SERVER=1` on free ports; then `docker build -f docker/production/Dockerfile .`.
