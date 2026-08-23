---
id: 20260823-codex-launch-l1-logs
owner: codex
branch: codex/launch-l1-logs
status: active
updated: 2026-08-23T02:43:16Z
objective: Close L1 logging persistence and privacy gaps without retaining user content in operational logs.
---

## Scope

- Governing plan/spec: docs/plans/09-launch.md L1.6.
- In scope: authenticated and bounded client log intake, disabled-logging behavior, central persisted-log sanitization, and focused regression tests.
- Out of scope: changing logging retention scheduling in Coolify, production operations, or unrelated caller refactors when the central boundary covers them.

## Completed

- Read-only audit found unauthenticated arbitrary batch persistence, a disabled-logging bypass, and direct caller PII that requires central sanitization.
- Added server-side batch authentication and strict payload bounds, a central persisted-log sanitizer, and direct call-site removals for audited email, auth, route-error, and tag payloads.
- Restored the full unit gate by mocking the new rate-limit boundary in the pre-existing AI archive confirmation test.

## Working state

- Files currently dirty or expected to change: batch log route, server logger, log sanitizer and tests, audited call sites, AI archive test fixture, this handoff.
- Foreign changes that must remain untouched: primary checkout and D0 worktree changes; this worktree was clean at start.

## Verification

- Passed: npm run agent:context; git status --short (clean at start); `npm run type-check`; `npm run lint -- --quiet`; focused logger/route tests; `npm run test:unit -- --runInBand` (150 suites / 702 tests passed, 1 suite / 1 test skipped).
- Not run / still required: handoff validation, release integration, and broader L1 validation at the final boundary.

## Decisions and constraints

- Persisted logs must never contain mail/page content, tokens, or email addresses, even when a caller accidentally includes them.
- Batch route ownership is server-authenticated; its JSON is not a trusted schema.
- D0 visual/E2E remains serialized from every launch test using the shared test Postgres.

## Blockers

- Retention cron execution and production retention evidence require owner-operated Coolify; local implementation must still retain the documented schedule.

## Next action

- Run handoff validation, commit this scoped L1 logging unit, then merge it into the launch release line.
