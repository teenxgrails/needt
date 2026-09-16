---
id: 20260916-codex-billing-lifecycle-spec
owner: codex
branch: codex/billing-lifecycle-spec
status: complete
updated: 2026-09-16T20:10:09Z
objective: Close the remaining Phase 3.5 lifecycle-spec assertion gap without expanding the billing model.
---

## Scope

- Governing plan/spec: launch GOAL Phase 3.5 and `docs/plans/12-remaining-work.md` P0.2.
- In scope: prove the recorded `subscription.active` event is processed and immediately grants protected PRO access; document current Creem contract and known out-of-scope model gaps.
- Out of scope: refunds, disputes, per-subscription rows/P0.5, production Creem, deployment, and protected-branch changes.

## Completed

- Confirmed PR #27 is merged into `origin/main` and already covers signature validation, replay/idempotency, cancellation grace, expiry/revocation, post-expiry resubscribe, failed-payment recovery, and Lifetime.
- Queried current Creem documentation through Context7 for event/status/signature behavior.
- Independent Sol/Terra audits identified one in-scope test gap: `subscription.active` was sent but not asserted before cancellation.
- Added a direct post-`subscription.active` assertion for the processed event cursor and immediate access to a PRO-protected shared workspace route.
- Committed the scoped follow-up as `d6b91e8`, pushed the feature branch, and opened draft PR #41.

## Working state

- Branch is clean apart from this final handoff checkpoint; CI is running on draft PR #41.
- Foreign changes that must remain untouched: every other worktree and the dirty primary checkout.

## Verification

- Passed: current Creem Context7 review; focused billing E2E (3/3); `npm run type-check`; `npm run lint`; full unit (168 suites / 807 tests, 1 suite / 1 test skipped); `npm run build` (142 pages / 1,393 artifacts); UI contracts; branding; handoff validation; diff check.
- Not run: no visual suite because this change is test-only and modifies no UI or baseline.
- First build attempt failed only on ENOSPC during trace copying. Per standing authorization, removed the worktree `.next`, npm cache, and Playwright cache; the clean retry passed.
- After CI started, removed the regenerated `.next` (~3 GiB), stopped `billing-lifecycle-spec-db-1`, and confirmed the E2E PostgreSQL/Redis containers are stopped; no volume was deleted.

## Decisions and constraints

- Treat current recorded/sanitized fixtures as the repository contract; make no live Creem call.
- Resubscribe during cancellation grace remains the documented P0.5 single-row-model gap; Phase 3.5 covers resubscribe after expiry.
- Refund and dispute handling remains explicitly out of scope for this phase.
- No production, Neon, deploy, `main`/`landing` push, PR merge, or visual baseline update.

## Blockers

- None.

## Next action

- Owner may review and merge draft PR #41 after its CI completes; P0.5 and refund/dispute handling remain separate follow-ups.
