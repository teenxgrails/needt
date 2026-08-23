---
id: 20260823-codex-terra-launch-release
owner: codex
branch: codex/terra-launch-l0
status: active
updated: 2026-08-23T14:20:00Z
objective: Complete the Terra-owned CI gates, release documentation, task-model backlog, and the evidence-based /today error investigation on the Sol RC.
---

## Scope

- Governing plan/spec: `docs/plans/09-launch.md`; owner-provided Terra brief dated 2026-08-23.
- In scope: `.github/workflows/docker-publish.yml`, `docs/**`, launch handoff, CI tests needed for the workflow contract, and a narrowly evidenced `/today` error fix if one is local and testable.
- Out of scope: production deployment or account actions; secrets; Sol-owned `src/collaboration/**`, `package.json` build scripts, `next.config.js`, Docker runtime architecture, and Coolify configuration; dirty primary-checkout files.

## Completed

- Recovered an isolated `codex/terra-launch-l0` worktree from `codex/launch-l0 @ 2240f1f`; working tree is clean.
- Loaded the handoff and tool-routing protocols. Read-only CI, documentation, and `/today` audits are running in parallel.
- `98c9a8c ci(release): wire secure runtime gates` passes the three Sentry values through BuildKit `secrets:`, bounds the existing executable collaboration smoke, and polls all three service health endpoints after serialized redeploys. Focused workflow tests, full lint, and type-check passed.
- Read-only `/today` audit identified the unhandled browser fetch rejection in `WorkspaceProvider` bootstrap. The current fix catches it at the effect boundary, logs only the error type, and prevents logger failure from becoming another rejection; focused tests, full lint, and type-check passed.
- Ported the owner-approved Plan 11 task-model backlog from the dirty primary checkout into this isolated line. Documentation now records manual rollback policy, Sentry BuildKit upload, all-service SHA health, the `.mjs` collaboration command, L1.6 evidence, and the deferred email-verification policy choice.
- `b73fe22 docs(plans): capture task shape backlog` records the Plan 11/documentation unit. `cca8fac fix(workspaces): contain bootstrap fetch failures` records the `/today` workspace-bootstrap rejection fix and regression test.

## Working state

- Resumed against Sol `92093f8` to reconcile the private worker SHA contract. Expected Terra-owned changes: `.github/workflows/docker-publish.yml`, CI contract tests, `docs/**`, and this handoff. `/today` stays scoped to the already-landed `cca8fac` unless fresh local evidence finds a distinct cause.
- Foreign changes that must remain untouched: all dirty files in `/Users/lol/Needt`; Sol-owned runtime/build paths above; `.agents/handoffs/20260823-codex-sol-runtime-release.md` is history, not an edit target.

## Verification

- Passed: `npm run agent:context`; clean isolated worktree check; official Buildx secret-input documentation lookup; focused workflow, environment-contract, and workspace-provider tests (13 tests); Node 22 `npm run type-check`; Node 22 `npm run lint -- --max-warnings=0`; full unit suite (157 passed suites / 724 tests, 1 suite/test skipped); `npm run build`; `npm run build:worker`; `npm run build:collaboration`; `npm run check:collaboration-runtime`; `npm run check:branding`; `npm run check:ui-contracts`; `npm run check:agent-handoffs`; `git diff --check`.
- Not run / still required: CI run with repository/environment secrets; production deploy/smoke; Docker-local gate excluded by plan; D0/launch E2E/visual waves excluded while Docker is unavailable.

## Decisions and constraints

- Pass Sentry values only through `docker/build-push-action@v6` BuildKit `secrets:`; never a build arg or image environment value.
- Manual rollback remains the approved policy; documentation must not claim a rollback hook exists or auto-rollback occurs.
- The existing Sol collaboration smoke is the authoritative executable check; Terra only wires it into CI and documents its role.
- Dated L1.6 evidence from the owner, 2026-08-23, host `root@needt` (Coolify VPS): `/etc/docker/daemon.json` uses `json-file` with `max-size: 10m` and `max-file: 3`; `default-address-pools` remains Coolify-managed. `/var/lib/docker/containers` was 34M. Largest JSON logs were 9.5 MB `.log.1`, 6.9 MB, 6.5 MB, 5.4 MB, and 3.4 MB; no file exceeded 10 MB and `.log.1` proves rotation. Docker was not restarted and containers were not recreated. The host also has a 4 GB `/swapfile` in `/etc/fstab`; before this it had no swap on 7.6 GiB RAM / 4 cores, causing Coolify build OOMs.

## Blockers

- CI source-map upload and production verification require GitHub/Coolify execution and owner-managed secrets. The owner must ensure the deployed image receives the exact 40-character source SHA, then execute `workflow_dispatch` and preserve Sentry-upload plus web/worker/collaboration convergence evidence. `NEEDT_PRODUCTION_WORKER_HEALTH_URL` is no longer valid because worker health is private; Terra must reconcile the workflow with Sol before a run.

## Next action

- Merge Sol `92093f8`, then reconcile CI/documentation and rerun focused gates before handing the release operator the exact remaining external checklist.
