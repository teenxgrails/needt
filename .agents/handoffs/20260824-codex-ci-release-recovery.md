---
id: 20260824-codex-ci-release-recovery
owner: codex
branch: codex/ci-release-recovery
status: blocked
updated: 2026-08-23T23:01:36Z
objective: Repair the post-push CI failures, OAuth scope contract, and release documentation with full local gates and no production action.
---

## Scope

- Governing plan/spec: owner brief dated 2026-08-24; `docs/plans/09-launch.md`; `docs/plans/README.md` additive migration rules.
- In scope: Semgrep findings, Prisma schema drift, CI-only unit failure/count mismatch, Google sign-in/calendar/task scope separation, deferred Google Tasks failure behavior, OAuth redirect documentation contract, sequential manual deployment documentation, tests, and this handoff.
- Out of scope: push, PR, merge, Coolify changes, production operations, Docker, E2E, visual tests, and unrelated product/design work.

## Completed

- Created this isolated writer worktree from `origin/main` at `c80071676392bef8d08a5862225b8ab8f9b5c225`.
- Completed a read-only release critique: preserve additive migration compatibility; harden workflow-run provenance as well as pinning actions; do not accept `-k` or test-result adjustment as release evidence.
- `c2d6a61 fix(release): close CI environment blockers` hardens privileged workflow provenance, pins every production action, records the audited loopback-only Semgrep suppression, restores legacy Prisma indexes, adds an additive join-table PK migration, makes the scheduling fixture timezone-independent, and documents sequential deployment with Auto deploy disabled.
- `2b5a860 fix(auth): separate Google consent scopes` limits Google sign-in to `openid email profile`, requests Calendar scopes incrementally, defers Google Tasks behind one scope contract with an actionable error, centralizes runtime redirect construction, and pins deployment documentation to the actual callbacks.
- Three parallel Terra audits independently confirmed the Semgrep, Prisma, and CI timezone root causes. The reported 756-versus-757 difference was passed tests versus total tests, not a missing test.

## Working state

- Files currently dirty or expected to change: this handoff only; all implementation is committed locally in `c2d6a61` and `2b5a860`.
- Foreign changes that must remain untouched: all dirty files in `/Users/lol/Needt`; every other registered worktree and active handoff; Coolify and production configuration.

## Verification

- Passed on Node 22.16.0: focused OAuth/task/doc tests (17); focused release/Prisma/deploy tests (22); scheduling buffer suite in both `TZ=UTC` and `TZ=Europe/Zurich` (3 each); Prisma format/generate/validate; `npm run type-check`; zero-warning `npm run lint`; full CI-env unit suite in `TZ=UTC` (164 suites passed, 1 skipped; 773 tests passed, 1 skipped, 774 total); `npm run build` (142 static pages and postbuild artifact check, 1,390 files); `npm run build:worker`; `npm run build:collaboration`; `npm run check:collaboration-runtime`; branding; UI contracts; handoff validation; `git diff --check`.
- Semgrep 1.172.0 passed all 17 changed executable/test files with 0 blocking findings. PostgreSQL's documented `ADD CONSTRAINT ... PRIMARY KEY USING INDEX` contract was verified against the official docs; the migration contains no `DROP` and preserves immutable history.
- First web-build attempt hit `ENOSPC`. Removed only four regenerable `.next` directories, freeing about 9.8 GiB; the clean retry passed.
- Not run: E2E, visual, or any image build. The exact CI `prisma migrate diff --from-migrations ... --shadow-database-url ... --exit-code` remains unverified locally because no PostgreSQL server is listening.
- Owner subsequently authorized a branch push/PR and a one-time PostgreSQL 16 container. Docker Desktop startup was rejected before any container existed; PR CI is the approved equivalent PostgreSQL 16 execution path and cannot pass the production workflow provenance gate from a PR branch.
- The remote push was also rejected before creating external state because the safety reviewer requires the authorization as a direct user chat message rather than goal-continuation context.

## Decisions and constraints

- No push and no Coolify changes. Auto deploy stays intentionally disabled until builds move off the VPS to a verified GHCR image.
- Migrations remain additive expand/backfill only; never drop legacy indexes or rewrite existing migration history.
- Each fix needs a regression test that would have failed before it.

## Blockers

- No remote branch or PR exists yet. Docker and push both require a direct user chat authorization accepted by the safety reviewer; no container exists or needs cleanup.

## Next action

- After the user repeats the push/PR authorization directly in chat, push `codex/ci-release-recovery` to `origin`, open a PR into `main`, and wait for its PostgreSQL 16 schema-drift job. Do not merge or touch Coolify.
