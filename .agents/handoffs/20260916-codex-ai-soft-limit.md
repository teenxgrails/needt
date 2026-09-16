---
id: 20260916-codex-ai-soft-limit
owner: codex
branch: codex/ai-soft-limit
status: complete
updated: 2026-09-16T01:25:58Z
objective: Keep hosted AI available in a bounded slow mode after the normal allowance without exposing usage numbers.
---

## Scope

- Governing plan/spec: GOAL Phase 3.1 second PR and item 3 in `/Users/lol/Needt-handoff/2026-09-15-docs-refresh/files/docs/plans/13-pricing.md`.
- In scope: slow-mode queue, hosted response ceiling of 600 tokens, configurable ceiling multiplier default 2, no-number status copy, env docs, tests, changelog, draft PR to `main`.
- Out of scope: code prices/token counters (PR #35), Lifetime buyer cap, trial, model-name change/live provider call, landing, Neon, production/Coolify, deploy, protected-branch push, merge.

## Completed

- Created a clean worktree from `origin/main` at `72eeef6`.
- Added a configurable 2x hosted-AI ceiling with atomic, concurrency-safe
  action claims and normal/slow/blocked status boundaries.
- Added a Redis-backed per-user FIFO slot delay for slow mode and fail-closed
  handling when a short slot cannot be reserved.
- Applied `max_tokens: 600` to every OpenAI-compatible provider request in
  hosted slow mode while leaving BYOK requests uncapped.
- Routed chat, task parsing and schedule suggestions through one claim path;
  fixed hosted AI for users whose saved provider is `NONE`.
- Replaced chat allowance counts and hard-limit copy with the exact busy and
  resting messages, surfaced non-streaming API errors, and refreshed status
  after each streamed response.
- Added focused boundary, atomic-claim, queue, provider, settings, route and UI
  contract coverage; updated env docs and changelog.
- Closed final review findings: stale confirmations no longer claim, all three
  visible parse-task consumers show busy/resting notices, and Redis reservation
  failures do not consume an action.

## Working state

- Files currently dirty or expected to change: AI usage/access settings, provider token ceiling plumbing, chat/parse/suggest routes as required, queue primitive/tests, env docs, user-facing no-number copy, changelog, this handoff.
- Foreign changes that must remain untouched: none in this worktree.

## Verification

- Passed: `npm run type-check`; `npm run lint`; `npm run test:unit` (173
  suites passed, 1 skipped; 824 tests passed, 1 skipped); focused soft-limit
  specs; `npm run check:ui-contracts` (475 files); `npm run
  check:branding` (944 files); `npm run check:agent-handoffs` (28 handoffs);
  `npm run build` (142 pages, production artifact check 1393 files); `git diff
  --check`.
- Independent Terra final review: no residual actionable findings after the
  three review fixes; its focused re-check passed 4 suites / 12 tests.
- Recovered from one `ENOSPC` rebuild by deleting only regenerable `.next`
  directories in the primary checkout and this worktree (about 7.4 GiB); the
  clean rebuild then passed. Source, untracked files, dependencies, env and DB
  were untouched.
- Not run / still required: CI after push.

## Decisions and constraints

- This PR is independent from PR #35 and branches directly from `origin/main`; owner merge order is PR #35 before this conflict-prone follow-up.
- BYOK is never throttled or capped. No numeric AI allowance appears in user-facing copy.
- The hard ceiling is claimed with one conditional PostgreSQL upsert. Redis is
  deliberately not the source of truth for the ceiling.
- The slow queue uses atomic Redis time slots rather than BullMQ: the HTTP
  request must return one synchronous/streamed result, while BullMQ would need
  a separate result-persistence and cancellation protocol. Existing slow-mode
  requests reserve a slot before claiming; a concurrent boundary-crossing
  claim is atomically released if its slot cannot be reserved.
- Invalid chat requests and missing conversations are rejected before the
  hosted action claim.
- Expired confirmations are also rejected before claiming. Task-parsing
  consumers display the API's busy/resting notice through the shared
  notification facade.
- Owner permanently authorized feature-branch pushes and draft PRs for GOAL work; no protected-branch push, merge, deploy, Coolify, Neon, or production operation.

## Blockers

- None.

## Next action

- Owner merges pricing/metering PR #35 first, then this branch's draft PR;
  resolve the expected usage/settings/provider/env union conflicts without
  restoring UI counts.
