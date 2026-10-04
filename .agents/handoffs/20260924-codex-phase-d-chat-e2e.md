---
id: 20260924-codex-phase-d-chat-e2e
owner: codex
branch: codex/phase-d-chat-e2e
status: active
updated: 2026-09-24T17:59:30Z
objective: Add focused browser E2E coverage for cancelling, applying, and undoing an AI reschedule preview.
---

## Scope

- Governing plan/spec: User-assigned GOAL Phase D browser E2E scope.
- In scope: A focused Playwright spec that mocks authentication, AI settings, conversations, chat NDJSON, and reschedule apply/undo endpoints.
- Out of scope: Product changes unless direct browser evidence proves a blocking defect; Docker, Neon, deployment, pushing, and unrelated tests.

## Completed

- Added focused browser coverage for cancelling a streamed `auto_schedule` preview without applying it.
- Added apply/undo coverage that verifies the preview token and server-returned undo token in the exact request bodies.
- No product code changed; the existing browser journey passed.

## Working state

- Files currently dirty or expected to change: `tests/ai-chat.spec.ts`; this handoff, pending scoped commit.
- Foreign changes that must remain untouched: None in this worktree at start.

## Verification

- Passed: `npm run agent:context`; initial `git status --short` clean; `npm exec --offline playwright -- test tests/ai-chat.spec.ts --list`; isolated Playwright run against installed Chrome (`2 passed`), without Docker or database setup; `npm run test:unit -- src/services/ai/__tests__/reschedule-preview.test.ts --runInBand`; `npm run type-check`; `npm run lint`; `git diff --check`; manual diff review.
- Not run / still required: Handoff validation and scoped commit.

## Decisions and constraints

- Reuse established route-mocking and signed-session patterns; do not touch product code unless the requested browser journey exposes a real blocker.
- Commit explicit owned paths only and do not push.

## Blockers

- None.

## Next action

- Validate the handoff and commit only the owned spec and handoff.
