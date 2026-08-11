---
id: 20260811-codex-release-health-bootstrap
owner: codex
branch: codex/release-health-bootstrap
status: active
updated: 2026-08-11T00:51:38Z
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

## Working state

- Files currently dirty or expected to change:
  `.github/workflows/docker-publish.yml`, release contract tests if required,
  and this handoff.
- Foreign changes that must remain untouched: all dirty files in the primary
  `/Users/lol/Needt` checkout.

## Verification

- Passed: release gates and multi-architecture image publication for
  `328b60e07b262db711dbbaf38b76b90f669a7976`; targeted production workflow
  contract tests; type-check; lint; Prettier; `git diff --check`.
- Not run / still required: CI, deploy, and production smoke.

## Decisions and constraints

- A missing previous health snapshot may not block bootstrap deployment.
- The post-webhook gate must still require the exact release SHA and healthy
  database before worker and collaboration redeploys.
- Do not start S6 before green production smoke. Do not start T5.

## Blockers

- Production web is currently unavailable before redeploy; the hotfix removes
  that bootstrap deadlock without weakening the release gate.

## Next action

- Commit and push the hotfix, open/merge its PR after green CI, then monitor the
  production workflow through exact-SHA smoke.
