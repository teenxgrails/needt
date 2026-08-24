---
id: 20260824-codex-billing-lifecycle-coverage
owner: codex
branch: codex/billing-lifecycle-coverage
status: active
updated: 2026-08-24T18:58:51Z
objective: Prove and harden the complete Creem billing lifecycle with recorded fixtures, ordering safety, idempotency, and server-side entitlement enforcement.
---

## Scope

- Governing plan/spec: `docs/plans/12-remaining-work.md` P0.2 and prompt 5 in `docs/plans/12-codex-prompts.md`.
- In scope: current Creem documentation audit, recorded webhook fixtures/tests, lifecycle mapping and persistence, replay/out-of-order/tamper protection, failed-payment semantics, and server entitlement checks.
- Out of scope: live Creem API/dashboard operations, prices, production data/secrets, Swiss tax/invoice decisions, deployment, Terra/P2 work, and LIFETIME semantic changes.

## Completed

- Created a clean isolated worktree from `origin/main` at `40b9ecb15c7cbc2fa47fc1a9e8aae9b0c221b9a8`.
- Queried Context7 `/websites/creem_io` on 2026-08-24 before auditing code. Current docs specify raw-body HMAC-SHA256 in `creem-signature`; non-200 deliveries retry after 30 seconds, 1 minute, 5 minutes, and 1 hour and can be manually resent; handlers must be idempotent because duplicate delivery is possible. Documented events carry an `id` and `created_at`; the retrieved docs state no delivery-order guarantee.
- Audited the installed `@creem_io/nextjs` 0.5.2 callback contract as well: it exposes those fields as `webhookId` and `webhookCreatedAt`, but Needt currently discards both.
- Pre-edit divergence report:
  - `webhook-processor.ts` has no durable event receipt. Its test explicitly expects the same webhook to upsert twice, so retry/manual resend is not deduplicated.
  - Neither processor nor subscription persistence records provider event time. An older `active`/`paid` event can overwrite a newer cancel/expiry; only the special LIFETIME downgrade guard survives stale delivery.
  - Concurrent different events are not serialized, so adding a timestamp comparison without transaction isolation would still permit last-committer-wins entitlement regression.
  - `subscription.unpaid` is collapsed into `PAST_DUE`; the schema/UI already distinguishes `PAYMENT_FAILED`, but the user gets only a status badge and no instruction, retained-access boundary, or loss timing.
  - Current docs also expose `subscription.trialing`; the installed route/mapping omits it even though Creem defines it as a grant-access state.
  - Raw-body verification is correctly delegated to the installed SDK and matches current HMAC-SHA256 documentation, but no regression test proves a body mutation is rejected.
  - Cancellation grace and expiry mapping are directionally correct, and trusted product-ID mapping prevents metadata plan escalation, but neither is covered by recorded end-to-end fixtures.
  - The authenticated portal route is wired to the stored Creem customer ID, but no non-network contract test protects that wiring.
- Server entitlement audit found no missing public boundary in the requested matrix: calendar/mail/auto-scheduling/focus/reminder/booking/nudges/hosted-AI paths resolve `getPlan()` server-side; the legacy boards API is disabled; shared-workspace listing and authorization both resolve `getPlan()` on every request. The missing proof is an end-to-end downgrade assertion against a shared workspace.
- Added an additive `CreemWebhookEvent` receipt table plus provider event identity/time on `Subscription`; processing now deduplicates replays and serializes event application so older events cannot reactivate a newer cancellation.
- Added explicit `PAYMENT_FAILED` retry/grace behavior, preserved the existing paid-through date when Creem omits it from retry events, supported the documented trialing event, and made Billing settings state the recovery action and loss boundary.
- Added sanitized recorded official-payload fixtures and `tests/billing.spec.ts` for tamper rejection, checkout/active/cancel/grace/expiry/resubscribe, replay, out-of-order delivery, failed-payment recovery, immediate shared-workspace downgrade enforcement, and renewal-less LIFETIME.
- Added a no-network customer portal contract test and updated the changelog.
- Fast-forwarded onto fresh `origin/main` `0483d2620d02` before the final verification boundary.
- Committed the verified scope as `bf0c6ba` and opened non-merge PR #27: `https://github.com/teenxgrails/needt/pull/27`.
- Root review found one remaining ordering divergence: events can share Creem's provider timestamp, so a late `active`/`paid` event at exactly the stored timestamp could still weaken a same-subscription scheduled-cancel, past-due, unpaid, canceled, or expired state. The processor now applies a fail-safe restriction ordering for equal timestamps only when the Creem subscription ID is unchanged. Equal-time events may preserve or strengthen the state; a weaker event is durably recorded without mutation. A different subscription ID bypasses this tie-break so a legitimate resubscribe is not blocked. Event IDs are never treated as temporal ordering.
- Added focused coverage for every restrictive state against both equal-time `active` and `paid`, a stricter equal-time transition, a same-timestamp new-subscription resubscribe, and a signed recorded-fixture route/DB regression for equal-time active-after-cancel.

## Working state

- Files currently dirty or expected to change: equal-time ordering follow-up plus this handoff until its scoped commit.
- Foreign changes that must remain untouched: all files in `/Users/lol/Needt`, every other registered worktree, and every other active handoff.

## Verification

- Passed after fresh main: `npx prisma validate`; `npm run type-check`; `npm run lint` (zero warnings); `npm run test:unit -- --runInBand src/lib/creem src/lib/entitlements`; `PORT=3105 TEST_BASE_URL=http://127.0.0.1:3105 npm run test:e2e -- tests/entitlements.spec.ts tests/billing.spec.ts` (5/5); `npm run build`; `git diff --check`.
- Repeated after the equal-time ordering fix: `npx prisma validate` with the local test DB URLs (schema valid); `npm run type-check`; `npm run lint` (zero warnings); focused unit gates (3 suites / 26 tests); required Playwright lifecycle/entitlement gate (5/5); `npm run build` including production artifact checks.
- A focused browser-backed billing run also rendered and asserted the retained-access warning before the stable lifecycle suite was narrowed to API/DB state; the notice text is now independently covered by focused unit tests.
- The first build compiled successfully but failed during page-data collection on `ENOSPC`; deleting only this worktree's regenerable `.next` freed about 9.8 GiB, and the clean rerun passed including production artifact checks.
- Not run / still required: PR #27 CI after the final handoff checkpoint push.

## Decisions and constraints

- No live API calls or dashboard changes. Fixtures are sanitized recorded shapes from current official documentation.
- Failed-payment policy and every implementation divergence will be recorded here before code changes.
- Failed-payment policy: `subscription.past_due` and `subscription.unpaid` show an actionable billing warning and portal action while retaining the paid plan only through the stored `currentPeriodEnd` during Creem retries. A later `active`/`paid` event restores `ACTIVE`. `expired`/`paused`, or a failed-payment/canceled event with no future paid-through date, resolves to FREE immediately; standard scheduled cancellation keeps access only until period end. The membership row survives downgrade, but every shared-workspace list/access request immediately hides or rejects it because `getPlan()` resolves FREE.
- Swiss-seller tax/invoice configuration remains an owner-only dashboard check.

## Blockers

- None for delivery. Owner follow-up: confirm Swiss-seller tax/invoice fields in the Creem dashboard; no dashboard action was taken here.

## Next action

- Commit and push this PR checkpoint, monitor PR #27 to green CI, then mark this handoff complete without merging.
