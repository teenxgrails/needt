---
id: 20260823-codex-release-revision2
owner: codex
branch: codex/terra-launch-l0
status: ready_for_owner
updated: 2026-08-23T17:52:00Z
objective: Close the revision-2 release correctness gaps before any main push or Coolify auto-deploy.
---

## Scope

- Governing plan/spec: owner-provided release revision 2 dated 2026-08-23; `docs/plans/09-launch.md`.
- In scope: F1 unhealthy-production deploy recovery, F2 AMD64-only publish, F3 worker-heartbeat lifecycle, F4 bounded Redis health read, F5 self-host compose topology, regression tests, release documentation, and this handoff.
- Out of scope: production deploy, Coolify account configuration, secrets, pushing/merging to `main` before the owner verifies Source commit availability, D0/E2E/visual waves, and unrelated product work.

## Completed

- F1: deploy recording now defaults unknown and validates a prior web SHA without preventing a repair deploy when health is down.
- F2: CI publishes native `linux/amd64` only and no longer initializes QEMU.
- F3/F4: worker heartbeat starts before lengthy mailbox setup, uses per-instance ownership plus atomic compare-and-delete on shutdown, and worker release reads fail fast when Redis is unavailable or stalls.
- F5: Compose now starts app, private worker, collaboration, PostgreSQL, and Redis with migration ordering, health checks, and container-local connection URLs; host development variables remain localhost.
- Documented the current Coolify source-commit setting name and release prerequisite.

## Working state

- Local implementation is committed on `codex/terra-launch-l0`: `4dc9994` (CI recovery/AMD64), `cf78082` (worker heartbeat health), and `0b4084c` (Compose topology/docs). No application source was changed outside the F1-F5 release scope.
- Foreign changes that must remain untouched: dirty `/Users/lol/Needt`; completed Terra and Sol handoffs; no Coolify configuration is represented in this repository.

## Verification

- Passed: focused regression tests (45 tests); `npm run type-check`; `npm run lint`; full unit suite (159 suites, 753 passed, 1 skipped); `npm run check:branding`; `npm run build:worker`; `npm run build:collaboration`; `npm run check:collaboration-runtime`; `npm run build` after reclaiming the current worktree's 3.3 GiB `.next` cache; `git diff --check`.
- Compose YAML/static contract passed. `docker compose config --quiet` could not run because this isolated worktree intentionally has no `.env`; it stopped before reading the config.
- Not run: launch E2E/visual suites and Docker image build are explicitly outside this revision scope. Owner verification of the three Coolify resource settings and production health/parity remains required.

## Decisions and constraints

- Never push to `main` before the owner verifies all three Coolify services inject a real source commit during build; auto-deploy otherwise turns a code push into a production outage.
- Worker health remains private. Do not add `NEEDT_PRODUCTION_WORKER_HEALTH_URL` or expose port 1235.
- Coolify source commit availability resolves the current `local` build identity without requiring an immediate GHCR migration. GHCR remains a later optimization, not a release prerequisite.

## Blockers

- Owner/Coolify action is required before any push: set Source commit availability to Available during build for needt, need-worker, and needt-collaboration; redeploy web; verify web health returns a 40-character Git SHA instead of `local`.

## Next action

- Owner: in all three Coolify resources (needt, need-worker, needt-collaboration), set Source commit availability to Available during build; redeploy web; confirm `/api/health` reports a 40-character SHA rather than `local`. Only then merge/push this branch and allow the normal SHA-parity deployment gate to run.
