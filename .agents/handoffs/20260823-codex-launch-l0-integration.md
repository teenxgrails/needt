---
id: 20260823-codex-launch-l0-integration
owner: codex
branch: codex/launch-l0-integration
status: active
updated: 2026-08-23T04:08:00Z
objective: Complete L0.3 by safely integrating the deferred Sol S11 and Terra T8 release lines, adding required browser coverage and release gates.
---

## Scope

- Governing plan/spec: `docs/plans/09-launch.md` L0.3.
- In scope: manual reconciliation of `codex/sol-s11-contracts` and `codex/terra-t8-product-ui`, new Playwright coverage for their user journeys, required validation, and a scoped integration commit.
- Out of scope: production deploy/data operations, owner credentials/accounts, legal copy, design direction, and unrelated D0 changes.

## Completed

- Started isolated integration worktree from launch L0.2 commit `b2079f8`.
- Completed read-only adversarial review: preserve AI workspace schema fields and the polling plus production-server E2E configuration; add journey-level coverage before merge.
- Merged `codex/terra-t8-product-ui` without commit and resolved `CHANGELOG.md`, `playwright.config.ts`, and `prisma/schema.prisma`; the resolved `Workspace` model retains `AiConversation`, `AiMessage`, and `AgentMemory` alongside the imported S11 relations.
- Added browser coverage for capacity preview/apply/undo, saved task views, and versioned project-health updates. The mocks now model an authenticated workspace member rather than bypassing the tenancy boundary.
- Committed the reconciled integration as `6f29e83 feat(launch): integrate workspace delivery`.

## Working state

- Files currently dirty or expected to change: this handoff; imported Sol/Terra implementation and migration files; reconciled schema/runtime E2E configuration; `tests/tasks.spec.ts`; `tests/projects.spec.ts`.
- Foreign changes that must remain untouched: all dirty files in `/Users/lol/Needt`, `/private/tmp/needt-launch-l0`, and `/private/tmp/needt-design-d0`.

## Verification

- Passed: Prisma format/generate/validate; `npm run type-check`; `npm run lint -- --quiet`; `npm run test:unit` (145 passed, 1 skipped); targeted `npm run test:e2e -- tests/tasks.spec.ts tests/projects.spec.ts` (3 passed); full `npm run test:e2e` (Playwright `.last-run.json`: passed); isolated `tests/moodboard.spec.ts` (2 passed); `npm run test:visual`; `npm run test:style`; `npm run build`; `npm run build:worker`; `npm run build:collaboration`; `npm run check:ui-contracts`; `npm run check:branding`; `npm run check:agent-handoffs`; `git diff --check`.
- Diagnostic result: the earlier full-E2E and style failures were a concurrent reset of the shared Docker E2E database, not an S11/T8 regression. The style and visual waves were then serialized; no failure artifacts or baseline changes remain. Terminated only orphaned local web-server processes left by the interrupted runners.
- Docker gate: BuildKit failed before project build completion with local Docker Desktop content-store I/O: `blob sha256:… expected … open …/content/blobs/sha256/…: input/output error`. A duplicate retry was terminated; no image was created or published. Restarted local Docker Desktop without pruning cache or data; daemon readiness/retry is next.
- Docker follow-up: after a targeted Docker Desktop backend restart, the backend process relaunched but its Unix socket still refuses `/_ping`. This is a local Docker Desktop availability issue, independent of the source tree; no data, volume, cache, image, or production state was changed.
- Next durable boundary: begin L0.4 only after refreshing its preflight checklist. Re-run the local Docker build once Docker daemon health is restored, before final release readiness.

## Decisions and constraints

- Preserve `AiConversation`, `AiMessage`, and `AgentMemory` workspace fields.
- Preserve `WATCHPACK_POLLING` and add production-server E2E mode instead of choosing one behavior.
- Do not update a visual baseline without manual diff review.

## Blockers

- Local Docker Desktop is unavailable after its BuildKit content-store I/O failure. No owner action is currently needed; retry when its local daemon is healthy. Shared E2E/visual database runs must remain serialized.

## Next action

- Read L0.4 requirements, reconcile the original launch handoff, and retry Docker when its local daemon is healthy.
