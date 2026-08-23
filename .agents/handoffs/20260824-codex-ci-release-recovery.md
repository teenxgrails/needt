---
id: 20260824-codex-ci-release-recovery
owner: codex
branch: codex/ci-release-recovery
status: complete
updated: 2026-08-23T23:31:47Z
objective: Repair the post-push CI failures, OAuth scope contract, and release documentation with full local gates and no production action.
---

## Scope

- Governing plan/spec: owner brief dated 2026-08-24; `docs/plans/09-launch.md`; `docs/plans/README.md` additive migration rules.
- In scope: Semgrep findings, Prisma schema drift, CI-only unit failure/count mismatch, Google sign-in/calendar/task scope separation, deferred Google Tasks failure behavior, OAuth redirect documentation contract, sequential manual deployment documentation, tests, and this handoff.
- Out of scope: merge, Coolify changes, production operations, Docker image builds, E2E, visual tests, and unrelated product/design work. The owner directly authorized one ephemeral PostgreSQL 16 container, branch push, and a PR into `main`.

## Completed

- Created this isolated writer worktree from `origin/main` at `c80071676392bef8d08a5862225b8ab8f9b5c225`.
- Completed a read-only release critique: preserve additive migration compatibility; harden workflow-run provenance as well as pinning actions; do not accept `-k` or test-result adjustment as release evidence.
- `c2d6a61 fix(release): close CI environment blockers` hardens privileged workflow provenance, pins every production action, records the audited loopback-only Semgrep suppression, restores legacy Prisma indexes, adds an additive join-table PK migration, makes the scheduling fixture timezone-independent, and documents sequential deployment with Auto deploy disabled.
- `2b5a860 fix(auth): separate Google consent scopes` limits Google sign-in to `openid email profile`, requests Calendar scopes incrementally, defers Google Tasks behind one scope contract with an actionable error, centralizes runtime redirect construction, and pins deployment documentation to the actual callbacks.
- Three parallel Terra audits independently confirmed the Semgrep, Prisma, and CI timezone root causes. The reported 756-versus-757 difference was passed tests versus total tests, not a missing test.
- After clearing only regenerable caches, recovered a stale Docker Desktop backend, ran the exact Prisma migration drift check against an ephemeral PostgreSQL 16 database, and removed both the container and the downloaded image.
- Pushed the branch to authoritative `origin` and opened https://github.com/teenxgrails/needt/pull/20 into `main` without merging or touching Coolify.
- `4c33d97 fix(ci): clear invalid Semgrep baseline` unsets GitHub's all-zero first-push baseline before the full Semgrep scan; its regression test, lint, and type-check passed locally.

## Working state

- Files currently dirty or expected to change: this handoff only; all implementation is committed locally in `c2d6a61` and `2b5a860`.
- Foreign changes that must remain untouched: all dirty files in `/Users/lol/Needt`; every other registered worktree and active handoff; Coolify and production configuration.

## Verification

- Passed on Node 22.16.0: focused OAuth/task/doc tests (17); focused release/Prisma/deploy tests (22); scheduling buffer suite in both `TZ=UTC` and `TZ=Europe/Zurich` (3 each); Prisma format/generate/validate; `npm run type-check`; zero-warning `npm run lint`; full CI-env unit suite in `TZ=UTC` (164 suites passed, 1 skipped; 773 tests passed, 1 skipped, 774 total); `npm run build` (142 static pages and postbuild artifact check, 1,390 files); `npm run build:worker`; `npm run build:collaboration`; `npm run check:collaboration-runtime`; branding; UI contracts; handoff validation; `git diff --check`.
- Semgrep 1.172.0 passed all 17 changed executable/test files with 0 blocking findings. PostgreSQL's documented `ADD CONSTRAINT ... PRIMARY KEY USING INDEX` contract was verified against the official docs; the migration contains no `DROP` and preserves immutable history.
- First web-build attempt hit `ENOSPC`. Removed only four regenerable `.next` directories, freeing about 9.8 GiB; the clean retry passed.
- Passed the exact CI `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url postgresql://needt:needt@127.0.0.1:55432/needt_shadow --exit-code` against `postgres:16-alpine`: exit 0, `No difference detected.` The disposable container `needt-schema-drift-20260824` and downloaded image were removed afterward.
- GitHub Actions runs `32673445836` (`push`) and `32673448129` (`pull_request`) both passed on implementation SHA `4c33d970b8ed923496efadf6a9f36c37a1d24089`: changes, security, PostgreSQL 16 schema-drift, quality-gates, E2E, and visual-style all succeeded. Visual/style execution correctly skipped because no matching UI paths changed.
- Not run locally: E2E, visual, or any Docker image build. GitHub Actions ran E2E successfully on both events; visual/style heavyweight steps were skipped by the path filter.

## Decisions and constraints

- No merge and no Coolify changes. Auto deploy stays intentionally disabled until builds move off the VPS to a verified GHCR image.
- Migrations remain additive expand/backfill only; never drop legacy indexes or rewrite existing migration history.
- Each fix needs a regression test that would have failed before it.

## Blockers

- None. PR #20 is open and unmerged; merge remains prohibited.

## Next action

- Owner reviews PR #20 and separately decides whether to merge. Do not merge or touch Coolify without a new direct instruction.
