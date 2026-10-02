# 12 — Remaining work to the first paying user

**Status:** active. Supersedes the sequencing in `09-launch.md` L0–L5, which was
written before those tasks landed. `09-launch.md` stays as the reference for what
each phase _means_; this file is the authority on what is _left_.

**Verified:** 2026-08-24 against `origin/main` `e93d61a`, the live Coolify
project `needt/production`, and production HTTP.

---

## What is already true (verified, not assumed)

Every line here was checked by a named operation on 2026-08-24. Do not re-do
this work, and do not trust `09-launch.md` where it contradicts this table.

| Claim                                        | Evidence                                                                                                          |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| One release SHA across all services          | `/api/health` → `buildSha` and `workerBuildSha` both `e93d61a`                                                    |
| S11 contracts merged                         | `git merge-base --is-ancestor codex/sol-s11-contracts origin/main` → true; 0 unmerged commits                     |
| T8 product UI merged                         | same for `codex/terra-t8-product-ui`; `MailFocusedSplit` and `SavedView` present in `origin/main` schema          |
| Figma capture script removed from production | `grep -n "figma" src/app/layout.tsx` → no match                                                                   |
| Collaboration service healthy                | `collaboration.use.needt.app` → 200, "Welcome to Hocuspocus!" (port fixed 3000 → 1234, redeployed 2026-08-24)     |
| Landing live                                 | `needt.app` → 200; CSP, nosniff, Referrer-Policy, Permissions-Policy all present                                  |
| `www` resolves and canonicalises             | `www.needt.app/?utm_source=test` → 301 → `needt.app/?utm_source=test` (Cloudflare redirect rule, query preserved) |
| Rate limiting is fail-closed                 | `src/lib/security/rate-limit.ts:141` returns 503 + `Retry-After` when Redis throws                                |
| Database backups run                         | Coolify: `daily` (15 executions, Success) and `weekly` (3, Success), both to `needt-r2-backups`                   |
| Creem is fully configured in production      | `CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET`, and three `prod_*` product IDs all present with values                   |
| Pricing in code matches the landing page     | `src/lib/creem/config.ts` — Pro $6/mo, $60/yr, Lifetime $79                                                       |

**Consequence:** `09-launch.md` L0.1, L0.2, L0.3, L0.4 are done. L1.2 and L1.5
are done in part. Close them; stop scheduling them.

## Status, 2026-08-25

| Item                       | State                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------ |
| P1.1 visual baselines      | merged (`c3e7a11`, `eb81407`); `Enforce visual gate` back to `run: exit 1` on `main` |
| P1.3 stale handoffs        | merged (`0483d26`)                                                                   |
| P0.2 billing               | PR #27, `bc255a6`, four audit rounds, three closed — see P0.5 for what is left       |
| P0.1 admin route           | `codex/admin-system-settings-route`, audited, fix round pending                      |
| P0.3 push config           | `codex/push-config-visibility`, audited, fix round pending                           |
| P0.4, P1.2, P1.4, P1.5, P2 | not started                                                                          |

**Creem has taken zero live payments** (dashboard, week of 2026-08-25: 0
deliveries, 0 successful, 0 failed). Nothing in P0.2 or P0.5 has cost money yet.
That is why the checkout stays open instead of being disabled.

---

## P0 — Needt is currently broken or dangerous for a real user

These are not "launch phase" items. Each is a live defect on a system that
already accepts traffic.

### P0.1 — Google and Outlook credentials cannot be entered at all

**The defect is not the missing secret. It is that there is no way to enter it.**

`SystemSettings` (`prisma/schema.prisma`) holds `googleClientId`,
`googleClientSecret`, `outlookClientId`, `outlookClientSecret`,
`outlookTenantId`. The component `src/components/settings/SystemSettings.tsx`
exists and the route `src/app/api/system-settings/route.ts` exists — but
**no page renders that component**. `git grep SystemSettings` finds it in the
store, the types, the API route and one test, and in no page under
`src/app/(app)/`. It is unreachable code.

Calendar connection is the core of the product. Without these credentials a new
user cannot connect Google Calendar, which means Needt does nothing for them.

- Mount `SystemSettings.tsx` on an admin-only route (`/admin/system` alongside
  the existing `/admin/operations`), or add it to the settings tab list behind
  `AdminOnly`. Pick one and make it reachable.
- Add a UI-contract assertion that every admin component has a route rendering
  it, so this class of defect fails a gate instead of surviving a release.
- Then enter the Google client secret (owner) and the Azure client secret
  (owner — registration already done, see the Azure app: client
  `f6215617-475b-4943-bc38-d2c9a09e0668`, tenant
  `2853777a-b5ec-4252-9ec2-0f9adbf74e3c`).
- Verify by connecting a real Google Calendar on production and seeing events
  sync into `CalendarEvent`.

**Blocks:** everything user-facing. Do this first.

### P0.2 — The checkout is live and the lifecycle has never been tested

Production has a real Creem API key, a real webhook secret and three real
product IDs. `isCreemConfigured()` requires exactly those five values, all five
are set, so `/api/billing` returns `configured: true` and the `disabled` guards
at `BillingSettings.tsx:300` and `:322` are open — **the checkout buttons are
live right now**. `tests/billing.spec.ts` does not exist.
`tests/entitlements.spec.ts` covers plan gating only.

The failure this permits: a user pays, the webhook is missed or replayed, and
the entitlement is never granted or never revoked. That is a refund and a
chargeback, not a redeploy.

- Create `tests/billing.spec.ts` driven by **recorded** Creem webhook payloads,
  not live network calls.
- Cover: checkout → active → entitlement granted → cancel → grace → expiry →
  entitlement revoked → resubscribe. Include LIFETIME, which never renews.
- Prove signature validation, replay protection and idempotency against Creem's
  current documented behaviour — query Context7, do not code from memory.
- Define the failed-payment path explicitly: what the user sees, what they keep,
  what they lose, when.
- Confirm the customer portal link works and that the Swiss-seller tax/invoice
  fields are set in the Creem dashboard (owner decision if not).

**Interim option, if this cannot be finished this week:** set
`CREEM_API_KEY` to empty in production. The buttons disable themselves and the
UI already explains why. Better a closed till than an unaudited one.

### P0.3 — Push reminders fail silently

`src/services/reminders/reminder-delivery.ts:91-94` reads `VAPID_SUBJECT`,
`NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`, and returns `false`
without logging if any is absent. Production has only
`NEXT_PUBLIC_VAPID_PUBLIC_KEY`.

A user enables push reminders, the UI confirms it, and nothing ever arrives.

- Generate the VAPID pair and set `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT`
  (a `mailto:` URI) on both `needt` and `need-worker`. The public key already in
  production must match the new private key — regenerate both together or reuse
  the existing pair if the private half still exists.
- Change that silent `return false` into a logged warning, so the next missing
  key is visible instead of invisible.
- Verify by sending one real push to a subscribed browser.

### P0.4 — Account deletion and data export do not exist

`src/app/api/export/` contains only `tasks`. `git grep` finds no
`deleteAccount`, no `data-export`, no account-deletion route anywhere in `src/`.
`src/app/privacy/page.tsx` is published on a live domain.

Whatever that page promises about deletion and portability, the code does not
do it. For a Swiss-resident seller with EU users this is the one gap that is a
legal exposure rather than a product gap.

- Implement account deletion honouring the S2 archive/tombstone semantics:
  soft-deleting objects is fine, but deleting an _account_ must actually remove
  personal data.
- Implement full data export (not just tasks).
- Create `tests/account-lifecycle.spec.ts` covering both flows.
- Re-read `privacy/page.tsx` afterwards and make it match what the code does.

### P0.5 — The subscription state model, and the two events nobody handles

Opened 2026-08-25, after four audit rounds on PR #27. Do **not** schedule this
as another patch to `webhook-processor.ts` — the patching is finished, and this
entry exists to say why.

**Stop patching the identity guard.** Rounds 1 through 4 each found a defect of
the same shape, and each fix closed the named sequence while opening the
adjacent one:

| round | what let a foreign subscription win                                                                                                                                            |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | subscription identity was never compared outside the equal-timestamp tie-break                                                                                                 |
| 2     | the guard only blocked events with `restrictionLevel > 0`, so a foreign `paid` adopted the row and the next `expired` was no longer foreign                                    |
| 3     | adoption was allowed whenever the stored row had `restrictionLevel > 0` — which includes `cancelAtPeriodEnd`, `PAST_DUE` and `PAYMENT_FAILED`, all of which still grant access |
| 4     | adoption now requires the stored cursor at level 5, which a normal cancellation never reaches, so a genuine resubscribe during grace is refused                                |

The root cause is the model, not any one condition. `Subscription` holds **one**
`creemSubscriptionId` per user, so every webhook must decide whether the row
"belongs" to the subscription that sent it. A user can legitimately have two
subscriptions in flight — resubscribe during grace, an accidental double
purchase, an upgrade — and one row cannot represent that.

The agent reached the same conclusion independently and recorded it as a
limitation rather than fixing it: `paid(A) → rejected paid(B) → expired(A)`
leaves the user FREE, because B was refused and never got a cursor.

- Model each Creem subscription as its own row, keyed `(userId,
creemSubscriptionId)`, carrying its own status, period end and cursor. The
  `CreemSubscriptionCursor` table added in PR #27 is already half of this.
- Derive entitlement from the **set**: a user has PRO if any of their
  subscriptions currently grants it. No row then needs to win an argument with
  another.
- Keep the existing `Subscription` row as a derived projection during the
  expand phase so nothing that reads it breaks. Additive migrations only.
- Delete `billing.test.ts:726` and rewrite it. It mocks the `sub_old` cursor at
  `restrictionLevel: 5` while the row is `CANCELED` with a future
  `currentPeriodEnd` — a state the processor cannot produce, because the cursor
  is written from `restrictionLevel(mutation.data)` and `CANCELED` with a date
  is level 4. The test is green over a broken grace-resubscribe path.

**`refund.created` and `dispute.created` are enabled in Creem and handled
nowhere.** The endpoint `https://use.needt.app/api/billing/webhook` has 13 event
types enabled; `webhook-mapping.ts` maps 11, and `src/app/api/billing/webhook/route.ts`
registers a handler for each of those 11. Neither refund nor dispute is among
them. A customer who charges back or takes a refund keeps PRO, silently and
with no record. Handle both, decide what a partial refund does, and cover them
with recorded fixtures like the rest.

---

## P1 — Required before telling anyone the product exists

### P1.1 — Merge the visual-baseline PRs, in order

1. **#22 first** — 41 files, every one a `*-linux.png`, zero code changed
   (`git diff --name-only origin/main origin/codex/linux-visual-baselines-20260824`).
   CI green including `e2e` and `visual-style`.
2. **#21 second, with one hunk dropped.** `.github/workflows/ci.yml` in #21
   replaces `run: exit 1` with `run: echo "::warning::…"` on the _Enforce visual
   gate_ step. #21 was written while the baselines were broken; #22 fixes them.
   Restore `run: exit 1` before merging. A "temporary" disablement that lands
   after the fix is how a gate dies permanently.

Everything else in #21 — `workflow_dispatch`, `scripts/update-visual-baselines.ts`,
`scripts/visual-baseline-update-guard.ts`, the two new tests — is sound, keep it.

Note for the next baseline refresh: the dispatch job refuses to run if the
target branch already exists on the remote, and the input default is
`codex/linux-visual-baselines` with no date. Pass a dated name.

### P1.2 — First-run experience on a clean database

`tests/e2e/auth.spec.ts` exists; `tests/onboarding.spec.ts` does not.

- Walk signup → verify → land → connect calendar → see a scheduled task on a
  clean database. Fix every dead end, unexplained disabled control and silent
  failure on that path. P0.1 is a prerequisite — the calendar step cannot pass
  before it.
- Purposeful empty state on every primary route: Today, Calendar, Tasks,
  Projects, Focus, Pages, Moodboards, Mail. Seed nothing fake.
- OAuth failure paths: denied consent, revoked token, expired refresh, wrong
  account — each needs a recoverable message.
- 360px and 390px on the same path.
- Create `tests/onboarding.spec.ts`.

### P1.3 — Close the three stale handoffs

`20260815-codex-delivery-audit`, `20260815-codex-mail-focused-splits` and
`20260816-codex-release-boundary-audit` are all still `status: blocked`, and all
three describe work that has since merged. A blocked handoff that is actually
done sends the next agent to re-solve a solved problem — this plan exists partly
because that already happened.

Close each with its real outcome and the SHA that resolved it.

### P1.4 — Restore drill

Backups run and succeed. A backup nobody has restored is a hypothesis.

Execute `docs/operations-runbook.md` §"Backups and restore drill" against the
newest R2 object. Record backup object, restore timestamp, duration, row counts
for `User` and `Task`, migration status, operator and outcome.

### P1.5 — Legal copy, owner-approved

`src/app/terms/page.tsx` and `src/app/privacy/page.tsx` are live and unreviewed.
Do not write or finalise legal text autonomously. The owner must decide
controller identity and retention periods. Two facts are already established and
belong in the copy:

- **Hosting jurisdiction is Finland, not Switzerland.** `95.216.213.174` is
  Hetzner Online GmbH, network `CLOUD-HEL1`, Helsinki (RIPE RDAP, checked
  2026-08-24). A Swiss-resident controller processing EU-resident data on
  EU-located infrastructure — the privacy page must say so accurately.
- **Subprocessor list:** Hetzner Online GmbH (compute), Cloudflare (DNS, proxy),
  Cloudflare R2 (backups), Resend (email), Sentry (error tracking), Creem
  (payments), Google, Microsoft, and the AI provider.

Do this after P0.4, so the page describes real behaviour.

---

## P2 — Launch operations

### P2.1 — Alerting, not monitoring

`src/services/operations/health.ts` and `src/worker/index.ts` contain alert
plumbing; nothing pages the owner. Add: health-check failure, error-rate spike,
queue depth growth, failed migration, webhook failure. Route to something the
owner actually reads.

### P2.2 — Funnel signal

`git grep funnel analytics` in `src/lib/` and `src/app/api/` → nothing. Add an
aggregate-only signal: signup → calendar connected → first scheduled task →
day-2 return. No third-party SDK.

### P2.3 — Release rehearsal, scoped down

`09-launch.md` L5 asks for a staging Coolify environment mirroring production.
None exists, and standing one up on the same 4-core box is what caused the
2026-08-23 outage — three parallel `npm ci` + `next build` runs.

Rehearse on production instead, deliberately: deploy from the green SHA, confirm
all three services report the same SHA, run the smoke list, exercise rollback
and confirm it works. The rollback test is the part that matters; do not skip it
because a staging environment is missing.

### P2.4 — Sentry correctness

Confirm release tagging matches `NEEDT_BUILD_SHA`, source maps upload, PII
scrubbing (no mail bodies, page content, tokens or emails in breadcrumbs or
extra context), and that web, worker and collaboration report distinguishably.
All the configuration is present; none of it is verified.

---

## Owner-only actions

Nothing below can be done by an agent. Everything above can.

1. Google client secret → enter it once P0.1 makes a screen for it.
2. Azure client secret → same screen. Registration is already complete.
3. Creem dashboard: confirm Swiss-seller tax/invoice fields.
4. Legal copy approval (P1.5).
5. Google OAuth verification submission — needs a demo video the owner records.
   Not a launch blocker; polling sync is the supported fallback.
6. Microsoft publisher verification (free MPN ID) — only affects work accounts
   from other tenants. Personal Microsoft accounts already work. Not a blocker.

---

## Order of work

| #   | Item                          | Depends on  | Rough size  |
| --- | ----------------------------- | ----------- | ----------- |
| 1   | P0.1 credentials screen       | —           | 1 session   |
| 2   | P1.1 merge #22 then #21       | —           | 15 min      |
| 3   | P0.3 VAPID + logged failure   | —           | 30 min      |
| 4   | P0.2 billing lifecycle + spec | —           | 2 sessions  |
| 5   | P0.4 deletion + export + spec | —           | 2 sessions  |
| 6   | P1.3 close handoffs           | —           | 20 min      |
| 7   | P1.2 first-run + spec         | P0.1        | 2 sessions  |
| 8   | P1.4 restore drill            | —           | 1 hour      |
| 9   | P1.5 legal copy               | P0.4, owner | owner-gated |
| 10  | P2.1–P2.4                     | P0, P1      | 2 sessions  |

Items 1–3 and 6 can run in one sitting. Items 4, 5 and 7 are the real work.

## Not authorized

Unchanged from `09-launch.md` L7: no new AI scheduler, no seat billing, no
cross-workspace views, no third-party document storage, no physical deletion of
user content, no read receipts, no team snippets, no Notion-style automation, no
portfolio management, no audio transcription, no new integrations.

Plan 10 (design identity) and plan 11 (task shape — T-1, T-2, T-4) stay queued
behind a stable production week, exactly as written.
