---
id: 20260823-codex-launch-l1-rate-limits
owner: codex
branch: codex/launch-l1-security
status: active
updated: 2026-08-23T04:52:00Z
objective: Complete L1.2 fail-closed rate-limit verification and apply distinct server-side budgets to high-cost billing and AI routes.
---

## Scope

- Governing plan/spec: `docs/plans/09-launch.md` L1.2.
- In scope: deterministic Redis-outage test; high-cost billing checkout/portal and AI-chat route limits with server-side authentication context.
- Out of scope: production configuration, Creem test purchases, external webhooks, D0, visual/E2E runs, migrations, and unrelated L1 items.

## Completed

- L0 release tagged `v0.4.0` at `70c1bc3`; local Docker is retired as a gate and CI Docker equivalence is verified.
- Read-only L1 preflight identified existing fail-closed helper behavior and missing route coverage.

## Working state

- Files currently dirty or expected to change: this handoff; rate-limit tests; the scoped billing and AI route modules.
- Foreign changes that must remain untouched: `/Users/lol/Needt`; `/private/tmp/needt-design-d0`; all D0 files; L0 release handoffs and worktrees.

## Verification

- Passed before this scope: L0.3 complete gates, including type/lint/unit/E2E/style/visual/builds.
- Not run / still required: targeted unit tests; type-check; zero-warning lint; route-scope review; handoff validation and scoped commit.

## Decisions and constraints

- Fail closed on Redis unavailability with a 503 and `Retry-After: 30`; missing `RATE_LIMIT_HASH_SECRET` remains a configuration error.
- Distinct budgets must be server-side and keyed to authenticated identity where available; route-specific IP limits are supplemental.
- Do not modify a billing webhook without checking its provider signature/replay semantics first.

## Blockers

- None.

## Next action

- Inspect all current AI and billing route auth/handler shapes, then add the smallest shared rate-limit rule set and an outage-focused unit test.
