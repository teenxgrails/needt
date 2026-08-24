---
id: 20260824-codex-billing-lifecycle-coverage
owner: codex
branch: codex/billing-lifecycle-coverage
status: active
updated: 2026-08-24T22:47:36Z
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
- Re-audited the branch against seven independent production-billing findings. Restrictive mutations now apply only to the currently stored Creem subscription ID; a newer grant can establish a replacement ID, while an ambiguous equal-time grant cannot replace an unrestricted live subscription.
- Cancellation and scheduled-cancellation events that omit `current_period_end_date` now preserve the stored paid-through date. Recorded E2E fixtures cover both omitted-field shapes and assert retained PRO access.
- LIFETIME is immutable after grant regardless of the later event's product ID or status. The recorded Pro-after-Lifetime fixture now uses the Lifetime customer's own Creem customer ID, and a same-product Lifetime expiry is also rejected.
- Every recorded webhook event ID is namespaced by the Playwright `runId`; retries keep the same ID within one run, while a retried worker/run cannot collide with abandoned receipts from an earlier run. The tautological mocked replay unit test was removed; a real checkout grant replay now proves the subscription row is not updated twice.
- Current Creem docs distinguish `paused` from `past_due`/`unpaid` and invoke access revocation for paused/expired states. Needt therefore keeps immediate FREE on `paused`; a focused test proves a later same-ID `subscription.update(status=active)` restores access. Creem does not document which webhook its resume endpoint emits, so webhook reconciliation remains a provider limitation rather than being mislabeled as dunning.
- PR CI run `32784182783` passed schema drift, quality gates, security, and the full E2E job. Its visual/style suites had 61 passes plus one unrelated `focus-dark` retry, but the gate correctly rejected three stable `settings-billing` Linux diffs caused by this PR enabling the Creem test configuration. The generated desktop/tablet/mobile candidates were reviewed individually: only the obsolete unconfigured warning disappeared and checkout controls became enabled, with correct layout at all three widths. Only those three Linux billing baselines were accepted; the flaky Focus candidate was byte-identical to the existing baseline and was not changed.
- Committed the reviewed Linux billing baselines as `74a2d02`. Fresh PR CI run `32785468174` passed schema drift, quality gates, security, full E2E (`5m16s`), and visual/style (`8m1s`) on that SHA. PR #27 is green and remains unmerged.

## Working state

- Files currently dirty or expected to change: this handoff until the final CI-evidence checkpoint commit.
- Foreign changes that must remain untouched: all files in `/Users/lol/Needt`, every other registered worktree, and every other active handoff.

## Verification

- Passed after fresh main: `npx prisma validate`; `npm run type-check`; `npm run lint` (zero warnings); `npm run test:unit -- --runInBand src/lib/creem src/lib/entitlements`; `PORT=3105 TEST_BASE_URL=http://127.0.0.1:3105 npm run test:e2e -- tests/entitlements.spec.ts tests/billing.spec.ts` (5/5); `npm run build`; `git diff --check`.
- Repeated after the equal-time ordering fix: `npx prisma validate` with the local test DB URLs (schema valid); `npm run type-check`; `npm run lint` (zero warnings); focused unit gates (3 suites / 26 tests); required Playwright lifecycle/entitlement gate (5/5); `npm run build` including production artifact checks.
- A focused browser-backed billing run also rendered and asserted the retained-access warning before the stable lifecycle suite was narrowed to API/DB state; the notice text is now independently covered by focused unit tests.
- The first build compiled successfully but failed during page-data collection on `ENOSPC`; deleting only this worktree's regenerable `.next` freed about 9.8 GiB, and the clean rerun passed including production artifact checks.
- Final independent audit gates produced the following output:

```text
$ DATABASE_URL=postgresql://needt:needt@127.0.0.1:5433/needt_test DIRECT_URL=postgresql://needt:needt@127.0.0.1:5433/needt_test npx prisma validate
Prisma schema loaded from prisma/schema.prisma
The schema at prisma/schema.prisma is valid 🚀

$ npm run type-check
> tsc --noEmit

$ npm run lint
> eslint . --max-warnings=0

$ npm run test:unit -- --runInBand src/lib/creem src/lib/entitlements
PASS src/lib/creem/__tests__/billing.test.ts
PASS src/lib/creem/__tests__/portal-route.test.ts
PASS src/lib/creem/__tests__/failed-payment.test.ts
Test Suites: 3 passed, 3 total
Tests:       35 passed, 35 total
Snapshots:   0 total
```

```text
$ npm run test:e2e -- tests/entitlements.spec.ts tests/billing.spec.ts
Running 5 tests using 1 worker
5 passed (22.6s)

$ npx playwright test tests/entitlements.spec.ts tests/billing.spec.ts
Running 5 tests using 1 worker
5 passed (17.0s)
```

  The second command intentionally bypassed `scripts/reset-e2e-environment.ts`; both full lifecycle/entitlement runs passed consecutively with no database reset between them. The shared test database is released for other agents.

```text
$ npm run build
✓ Compiled successfully in 17.1s
✓ Collecting page data
✓ Generating static pages (142/142)
✓ Collecting build traces
✓ Finalizing page optimization
Production artifact check passed (1379 files).
```

- The requested destructive mutation proof was attempted only through the patch tool and rejected before any edit: `The patch intentionally disables the subscription-identity security guard, even temporarily`. No guard was weakened and no bypass was attempted. The regression cases are directly exercised by the green unit/E2E suites, but the explicit red-run-by-deletion proof remains unexecuted under this environment policy.
- PR CI evidence after the reviewed baseline checkpoint: run `32785468174` completed successfully on `74a2d027355aa5406d75fe9b89196e24dc85335a`; schema drift, quality gates, security, full E2E, and visual/style all passed. The explicit mutation red-run still requires an execution environment that permits temporary guard removal.

## Decisions and constraints

- No live API calls or dashboard changes. Fixtures are sanitized recorded shapes from current official documentation.
- Failed-payment policy and every implementation divergence will be recorded here before code changes.
- Failed-payment policy: `subscription.past_due` and `subscription.unpaid` show an actionable billing warning and portal action while retaining the paid plan only through the stored `currentPeriodEnd` during Creem retries. A later `active`/`paid` event restores `ACTIVE`. `expired`/`paused`, or a failed-payment/canceled event with no future paid-through date, resolves to FREE immediately; standard scheduled cancellation keeps access only until period end. The membership row survives downgrade, but every shared-workspace list/access request immediately hides or rejects it because `getPlan()` resolves FREE.
- Subscription identity policy: a restrictive event for a different provider subscription ID is durably recorded without mutation. A newer unrestricted grant may establish a replacement ID. At equal provider timestamps, a different-ID grant may recover a restrictive row but cannot replace an unrestricted active row.
- Residual provider limitation: if every grant event for a new subscription is missed, Needt cannot infer that unknown subscription from a later restrictive event and intentionally rejects that restrictive event. Solving that requires provider reconciliation or per-subscription state, not guessing from a user-level row.
- LIFETIME policy is unchanged: once granted, it never renews and no later Creem subscription lifecycle event may reduce or replace it.
- Swiss-seller tax/invoice configuration remains an owner-only dashboard check.

## Blockers

- Delivery code/gates have no local blocker. The explicit mutation red-run is blocked by the execution policy described above. Owner follow-up: confirm Swiss-seller tax/invoice fields in the Creem dashboard; no dashboard action was taken here.

## Next action

- In a policy-permitted environment, temporarily remove the subscription-identity guard, run the focused old-subscription expiry regressions to capture the required red result, restore the guard, rerun them green, and then mark this handoff complete. No code, CI, merge, deploy, dashboard, or shared-test-DB action otherwise remains.
