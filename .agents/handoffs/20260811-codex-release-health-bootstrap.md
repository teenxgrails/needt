---
id: 20260811-codex-release-health-bootstrap
owner: codex
branch: codex/release-health-bootstrap
status: active
updated: 2026-08-12T01:29:15Z
objective: Make the production deployment bootstrap-safe when the previous web health endpoint is unavailable
---

## Scope

- Governing plan/spec: `NEXT_AGENT.md`, `docs/STACK.md`, and
  `.github/workflows/docker-publish.yml`.
- In scope: tolerate an unavailable pre-deploy health snapshot, preserve the
  strict post-deploy exact-SHA gate, and finish production smoke.
- Out of scope: S6 until production smoke is green, all T5 work, and unrelated
  product changes.

## Completed

- PR #16 merged as `328b60e07b262db711dbbaf38b76b90f669a7976`.
- Production workflow `31443497365` passed gates and image publication.
- Its deploy job failed before any webhook because `use.needt.app:443` was
  unreachable while recording the previous healthy SHA.
- The pre-deploy snapshot now records `unavailable` and continues when the old
  web health endpoint cannot be reached. The post-deploy exact-SHA/database
  gate remains unchanged and strict.
- Hotfix commit `32489a7` is pushed and PR #17 is open.
- PR #17 merged as `328f6b3b88e1f65c5d995ada178c9b2fb9a6c1dc`.
- Production workflow `31448735367` passed gates and published the multi-arch
  image. Its deploy job failed before the webhook reached Coolify because
  `coolify.needt.app:443` refused the connection.
- The server recovered after a provider reboot. Coolify and SSH are responsive;
  the host has 6.0 GiB available memory and 58 GiB free disk space.
- The queued web deployment built commit `328f6b3` successfully, then the web
  container crashed 128 times and Coolify stopped it. A production-equivalent
  one-off run reproduced the cause: Prisma could not write its missing schema
  engine into the root-owned runtime dependency layer.
- The runtime image fix copies the schema engine downloaded by the builder into
  both Docker release paths and asserts at build time that it is executable.

## Working state

- Files currently dirty or expected to change: `Dockerfile`,
  `docker/production/Dockerfile`, `src/__tests__/docker-quickstart.test.ts`, and
  this handoff.
- Foreign changes that must remain untouched: all dirty files in the primary
  `/Users/lol/Needt` checkout.

## Verification

- Passed: release gates and multi-architecture image publication for
  `328b60e07b262db711dbbaf38b76b90f669a7976`; targeted production workflow
  contract tests; type-check; lint; Prettier; `git diff --check`.
- PR-event security scanning passed. The first-branch push event had no baseline
  commit and therefore surfaced pre-existing repository findings; a checkpoint
  push supplied the correct branch baseline and both security jobs passed.
- Both CI runs on `739cdd8` passed, as did main CI `31448363881` on the merge
  SHA. Production image publication passed in workflow `31448735367`.
- The production database is reachable and has 86 known migrations, with the
  14 migrations from the failed release still pending. No migration was run by
  the diagnostic status check.
- Passed for the Prisma engine hotfix: targeted Docker contract test,
  type-check, lint, and `git diff --check`.
- Not run / still required: deploy and production smoke.

## Decisions and constraints

- A missing previous health snapshot may not block bootstrap deployment.
- The post-webhook gate must still require the exact release SHA and healthy
  database before worker and collaboration redeploys.
- Coolify web healthchecking must use `/api/health` before another rolling
  deployment so an unready container cannot replace the previous release.
- Do not start S6 before green production smoke. Do not start T5.

## Blockers

- None before committing the engine hotfix and enabling the web healthcheck.

## Next action

- Commit and push the Prisma engine hotfix, enable Coolify web healthchecking,
  merge after green CI, and monitor the new production workflow through
  exact-SHA web, worker, and collaboration smoke.
