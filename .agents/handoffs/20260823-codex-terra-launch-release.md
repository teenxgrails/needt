---
id: 20260823-codex-terra-launch-release
owner: codex
branch: codex/terra-launch-l0
status: active
updated: 2026-08-23T12:18:21Z
objective: Complete the Terra-owned CI gates, release documentation, task-model backlog, and the evidence-based /today error investigation on the Sol RC.
---

## Scope

- Governing plan/spec: `docs/plans/09-launch.md`; owner-provided Terra brief dated 2026-08-23.
- In scope: `.github/workflows/docker-publish.yml`, `docs/**`, launch handoff, CI tests needed for the workflow contract, and a narrowly evidenced `/today` error fix if one is local and testable.
- Out of scope: production deployment or account actions; secrets; Sol-owned `src/collaboration/**`, `package.json` build scripts, `next.config.js`, Docker runtime architecture, and Coolify configuration; dirty primary-checkout files.

## Completed

- Recovered an isolated `codex/terra-launch-l0` worktree from `codex/launch-l0 @ 2240f1f`; working tree is clean.
- Loaded the handoff and tool-routing protocols. Read-only CI, documentation, and `/today` audits are running in parallel.

## Working state

- Files currently dirty or expected to change: `.github/workflows/docker-publish.yml`, `docs/deploy.md`, `docs/plans/09-launch.md`, `docs/plans/README.md`, new `docs/plans/11-task-model.md`, focused workflow/document tests, and this handoff.
- Foreign changes that must remain untouched: all dirty files in `/Users/lol/Needt`; Sol-owned runtime/build paths above; `.agents/handoffs/20260823-codex-sol-runtime-release.md` is history, not an edit target.

## Verification

- Passed: `npm run agent:context`; clean isolated worktree check; official Buildx secret-input documentation lookup.
- Not run / still required: focused tests; Node 22 type-check/lint/unit/build gates; CI run with repository/environment secrets; production deploy/smoke; Docker-local gate excluded by plan.

## Decisions and constraints

- Pass Sentry values only through `docker/build-push-action@v6` BuildKit `secrets:`; never a build arg or image environment value.
- Manual rollback remains the approved policy; documentation must not claim a rollback hook exists or auto-rollback occurs.
- The existing Sol collaboration smoke is the authoritative executable check; Terra only wires it into CI and documents its role.

## Blockers

- CI source-map upload and production verification require GitHub/Coolify execution and owner-managed secrets; local work must fail closed without exposing them.

## Next action

- Incorporate the three audits, then implement T0 workflow secret wiring first and validate the workflow contract locally.
