---
id: 20260823-codex-launch-l0-consolidation
owner: codex
branch: codex/launch-l0
status: active
updated: 2026-08-23T04:40:00Z
objective: Complete L0.4 by consolidating the verified L0.1–L0.3 release line into one release SHA and closing superseded handoffs.
---

## Scope

- Governing plan/spec: `docs/plans/09-launch.md` L0.4.
- In scope: merge `codex/launch-l0-integration` into `codex/launch-l0`, close related L0 handoffs with their real outcomes, tag the final verified SHA, and record it in the changelog/handoff.
- Out of scope: production deploy/data operations, credentials, design direction, unrelated D0 source changes, and destructive Docker cache recovery.

## Completed

- L0.1 committed as `99d4004`; L0.2 committed as `b2079f8`.
- L0.3 verified and committed as merge SHA `eee3284` on `codex/launch-l0-integration`.
- Merged `codex/launch-l0-integration` into this release line as the local
  merge commit created for L0.4 consolidation.
- Adopted the owner-approved CI Docker gate retirement at `9a31eec`.

## Working state

- Files currently dirty or expected to change: this handoff; the prior
  launch/integration handoffs; `CHANGELOG.md` for the tagged release SHA.
- Foreign changes that must remain untouched: `/Users/lol/Needt`; `/private/tmp/needt-design-d0`; and all design-track files/handoff.

## Verification

- Passed for L0.3: type-check, zero-warning lint, unit (145 passed, 1 skipped), full E2E (passed), style, visual, production build, worker build, collaboration build, Prisma validate/generate, UI/branding/handoff checks, and targeted user journeys.
- CI Docker equivalence verified: `.github/workflows/docker-publish.yml` gates
  then builds `docker/production/Dockerfile` on `ubuntu-latest`, checking out
  and passing the same SHA as `NEEDT_BUILD_SHA`.
- Not run / still required: L0.4 release tag and topology audit; no local Docker
  build is required.

## Decisions and constraints

- `eee3284` preserves current AI workspace relations while importing S11/T8 additive migrations and user journeys.
- The owner retired the local Docker build gate: CI is authoritative for the
  production image on the same SHA; do not wait for local Docker Desktop.
- Shared visual/E2E database runs are serialized; D0 never delays launch.

## Blockers

- None for L0.4. The local Docker Desktop failure is no longer a launch gate.
  D0 runs its shared-Postgres validation separately from launch test waves.

## Next action

- Commit this checkpoint, tag the final L0 SHA as `v0.4.0`, record the SHA here,
  mark L0 complete, then start L1 without waiting for D0.
