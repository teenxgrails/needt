---
id: 20260823-codex-launch-l1-rate-limits
owner: codex
branch: codex/launch-l1-security
status: complete
updated: 2026-08-23T05:07:00Z
objective: Complete L1.2 fail-closed rate-limit verification and apply distinct server-side budgets to high-cost billing and AI routes.
---

## Scope

- Governing plan/spec: `docs/plans/09-launch.md` L1.2.
- In scope: deterministic Redis-outage test; high-cost billing checkout/portal and AI-chat route limits with server-side authentication context.
- Out of scope: production configuration, Creem test purchases, external webhooks, D0, visual/E2E runs, migrations, and unrelated L1 items.

## Completed

- L0 release tagged `v0.4.0` at `70c1bc3`; local Docker is retired as a gate and CI Docker equivalence is verified.
- Read-only L1 preflight identified existing fail-closed helper behavior and missing route coverage.
- Added a deterministic Redis-outage unit test and account/IP budgets for billing
  checkout, billing portal, and AI chat. Webhook scope remains deferred pending
  provider-signature/replay documentation review.
- Committed as `82d5427 fix(security): rate-limit billing and AI`.

## Working state

- None. This scoped L1.2 unit is committed.
- Foreign changes that must remain untouched: `/Users/lol/Needt`; `/private/tmp/needt-design-d0`; all D0 files; L0 release handoffs and worktrees.

## Verification

- Passed: `npm run test:unit -- --runInBand src/lib/__tests__/rate-limit.test.ts`;
  `npm run type-check`; `npm run lint -- --quiet`; `git diff --check`.
- Not run / still required: integration into the release line and the remaining
  L1 security/readiness items.

## Decisions and constraints

- Fail closed on Redis unavailability with a 503 and `Retry-After: 30`; missing `RATE_LIMIT_HASH_SECRET` remains a configuration error.
- Distinct budgets must be server-side and keyed to authenticated identity where available; route-specific IP limits are supplemental.
- Do not modify a billing webhook without checking its provider signature/replay semantics first.

## Blockers

- None.

## Next action

- Review the next L1 preflight item (Sentry release tagging and PII scrubbing)
  in a separate workstream.
