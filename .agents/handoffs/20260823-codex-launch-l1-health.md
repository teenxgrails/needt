---
id: 20260823-codex-launch-l1-health
owner: codex
branch: codex/launch-l1-health
status: complete
updated: 2026-08-23T02:47:53Z
objective: Make the production health endpoint fail closed when packaged Prisma migrations are pending and pin the deployment workflow's health URL guard.
---

## Scope

- Governing plan/spec: `docs/plans/09-launch.md` L1.3.
- In scope: packaged migration status comparison, non-sensitive `/api/health` failures, focused unit tests, and a static `HEALTH_URL` workflow assertion.
- Out of scope: rollback policy, plans/docs, Docker, production credentials/settings, and E2E/visual/Docker gates.

## Completed

- Started from clean `codex/launch-l1-health` at `f9948d4` after reading active handoffs and the L1 health requirement.
- Added a Node-runtime migration status helper that compares packaged migration directories with successful, non-rolled-back `_prisma_migrations` rows.
- `/api/health` now returns a non-sensitive `503` with `db: "migrations-pending"` for pending migrations and `db: "error"` for database/query errors; both retain only build identity and latency.
- Added health route/helper regression tests and the missing static `HEALTH_URL` workflow assertion.
- Committed the scoped implementation as `8aefd02 fix(launch): harden health migration checks`.
- Merged the scoped unit into `codex/launch-l0` as `9fa8549 fix(launch): harden release health`.

## Working state

- Files currently dirty or expected to change: None; implementation worktree is clean.
- Foreign changes that must remain untouched: all primary-checkout and D0 worktree changes; the L1 logging and Sentry workstreams and their handoffs.

## Verification

- Passed: `npm run agent:context`; initial `git status --short` (clean); `npm run test:unit -- --runInBand src/lib/health/__tests__/migrations.test.ts src/app/api/health/__tests__/route.test.ts src/__tests__/production-deploy-workflow.test.ts` (3 suites, 8 tests); `npm run type-check`; `npm run lint -- --quiet`; `git diff --check`; `npm run check:agent-handoffs`.
- Not run / still required: broader release gates and CI Docker-publish verification on the eventual merged SHA; intentionally no E2E, visual, or local Docker run in this isolated scope.

## Decisions and constraints

- Compare only packaged `prisma/migrations` directory names with successful rows in `_prisma_migrations`; never expose database exception text through `/api/health`.
- Do not run E2E, visual, or local Docker work in this workstream.

## Blockers

- None.

## Next action

- Resume the next L1 audit item from the launch release worktree.
