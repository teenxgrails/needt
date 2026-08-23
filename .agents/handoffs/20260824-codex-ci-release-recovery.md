---
id: 20260824-codex-ci-release-recovery
owner: codex
branch: codex/ci-release-recovery
status: active
updated: 2026-08-23T22:15:19Z
objective: Repair the post-push CI failures, OAuth scope contract, and release documentation with full local gates and no production action.
---

## Scope

- Governing plan/spec: owner brief dated 2026-08-24; `docs/plans/09-launch.md`; `docs/plans/README.md` additive migration rules.
- In scope: Semgrep findings, Prisma schema drift, CI-only unit failure/count mismatch, Google sign-in/calendar/task scope separation, deferred Google Tasks failure behavior, OAuth redirect documentation contract, sequential manual deployment documentation, tests, and this handoff.
- Out of scope: push, PR, merge, Coolify changes, production operations, Docker, E2E, visual tests, and unrelated product/design work.

## Completed

- Created this isolated writer worktree from `origin/main` at `c80071676392bef8d08a5862225b8ab8f9b5c225`.
- Completed a read-only release critique: preserve additive migration compatibility; harden workflow-run provenance as well as pinning actions; do not accept `-k` or test-result adjustment as release evidence.

## Working state

- Files currently dirty or expected to change: `.github/workflows/ci.yml`, `.github/workflows/docker-publish.yml`, `prisma/schema.prisma`, one additive migration if required, scheduling/OAuth/task-sync code and focused tests, `docs/deploy.md`, `docs/plans/09-launch.md`, `CHANGELOG.md`, and this handoff.
- Foreign changes that must remain untouched: all dirty files in `/Users/lol/Needt`; every other registered worktree and active handoff; Coolify and production configuration.

## Verification

- Passed: `git status --short` clean at worktree creation; `origin/main` verified at `c80071676392bef8d08a5862225b8ab8f9b5c225`.
- Not run / still required: focused regression tests; CI-equivalent unit run; schema drift; type-check; lint; full unit; web, worker and collaboration builds; collaboration runtime check; handoff validation; `git diff --check`.

## Decisions and constraints

- No push and no Coolify changes. Auto deploy stays intentionally disabled until builds move off the VPS to a verified GHCR image.
- Migrations remain additive expand/backfill only; never drop legacy indexes or rewrite existing migration history.
- Each fix needs a regression test that would have failed before it.

## Blockers

- None.

## Next action

- Run three parallel read-only Terra audits for Semgrep, Prisma drift, and CI-only unit behavior, then implement the reconciled fixes in this worktree.
