---
id: 20260916-codex-no-card-trial
owner: codex
branch: codex/no-card-trial
status: complete
updated: 2026-09-16T18:17:24Z
objective: Deliver one 14-day no-card Pro trial per verified email, with worker reminders and safe expiry to Free.
---

## Scope

- Governing plan/spec: GOAL Phase 3.2 and item 5 in `/Users/lol/Needt-handoff/2026-09-15-docs-refresh/files/docs/plans/13-pricing.md`.
- In scope: additive trial state, effective-plan resolution, day-11/day-14 worker emails with pay CTA, expiry without data loss, unit/E2E coverage, changelog, draft PR to `main`.
- Out of scope: Creem trials, pricing/AI/Lifetime work from Phase 3.1, production email/domain/account changes, deploy, protected-branch push, merge, Neon.

## Completed

- Added an additive `TrialGrant` claim keyed by canonical email, with a unique nullable user relation so deleting an account cannot restore trial eligibility. Gmail and Googlemail aliases strip dots and `+suffix`; a serializable transaction and unique index make concurrent claims atomic.
- Password signup stays Free and sends a 24-hour verification link. A scanner-safe public landing requires an explicit POST before it verifies the email and starts Pro. Resend failures remove only the new token and preserve older active links.
- Added Prisma-adapter-backed Google/Microsoft sign-in. OAuth identities are marked verified and start the trial in the awaited JWT callback; repeated callbacks remain idempotent.
- Added effective Pro entitlements until the exact trial expiry, billing trial state, day-11/day-14 emails, durable worker claims, skipped-record pagination, and safe expiry to Free without deleting content. Scheduling after expiry is capped to the Free allowance, including the first run of a new month.
- Added the optional server flag `requireEmailVerificationBeforeAccess` (default `false`) and enforced it before app-shell rendering and across shared user/admin auth, CalDAV test, admin-status, server admin checks, and connector bearer APIs.
- Blocked unverified owners from publishing booking pages, hid existing public pages/slots, blocked direct booking creation and guest email, and prevented reminder email fallback until the owner email is verified. Checkout also requires a verified email.
- Removed hosted-AI usage numbers from the three affected product surfaces and added a UI contract preventing their return.
- Added unit, local-Postgres concurrency, API, worker, scheduling, auth, and request-level E2E coverage; updated CI seeding, CI integration-test environment, changelog, and the handoff.

## Working state

- Files currently dirty or expected to change: the scoped Phase 3.2 implementation listed by `git status`; all are intended for the branch commit.
- Foreign changes that must remain untouched: none in this worktree.

## Verification

- Passed on local PostgreSQL `postgresql://fluid:fluid@127.0.0.1:5432/fluid_calendar` in container `no-card-trial-db-1`: all 100 migrations deployed; `prisma migrate status` up to date; canonical-email two-registration race grants exactly one trial.
- Passed: `npm run type-check`; `npm run lint`; `npm run check:ui-contracts`; `npm run check:branding`; `npm run check:agent-handoffs`; `npm run build:worker`; `git diff --check`.
- Passed: full unit suite with `TRIAL_INTEGRATION=1` — 178 suites passed, 1 skipped; 836 tests passed, 1 skipped.
- Passed: `npm run test:e2e -- tests/trial.spec.ts tests/entitlements.spec.ts tests/billing.spec.ts` — 7 passed, covering signup → Free → scanner-safe landing → POST confirmation → Pro → expiry → Free with retained task data, direct unverified booking rejection, and the adapter-backed OAuth callback path.
- Passed: `npm run build` with explicit loopback `DATABASE_URL` and `DIRECT_URL`; production artifact check passed.
- Not available on this `origin/main` base: `npm run tokens:check` (script does not exist). Run it after merging the design-completion dependency that introduces the token gate.
- Not run locally: live Google/Microsoft provider redirects, real Resend delivery/domain verification, full browser/visual suites, production Docker build. CI owns Docker; live provider/email checks require owner credentials and external state.

## Decisions and constraints

- Stored subscription should remain `FREE` during the app-owned trial; effective entitlement becomes `PRO` only while `trialEndsAt > now`.
- Trial emails must be claimed idempotently in the database and skipped after a paid purchase; day-11/day-14 send state cannot rely only on Resend idempotency retention.
- Existing data is never deleted on expiry. Free limits apply to new actions; already-created content remains visible.
- Password signup enters the product immediately on Free with `emailVerified = null`; verification is not a barrier by default and starts the trial only when the one-time 24-hour link is consumed.
- Google/Microsoft verified identity starts the trial atomically on first sign-in.
- One trial is keyed by a unique canonical email: lowercase; for `gmail.com` and `googlemail.com`, remove dots and the `+suffix` from the local part and canonicalize the domain.
- Unverified users cannot publish booking pages or trigger flows that email third parties. The UI says `Confirm your email to publish`; the server remains the security boundary.
- Add server feature flag `requireEmailVerificationBeforeAccess`, default `false`; when enabled, unverified users cannot enter the authenticated product.
- Verification email uses the existing Resend service and `VerificationToken` pattern, says `Confirm your email to start 14 days of Pro`, supports rate-limited resend from the app, and never exposes AI usage numbers.
- Confirmation is intentionally a public GET landing plus an explicit POST so email link-preview scanners cannot consume the one-time token or start the only trial.
- Active verification tokens coexist across resend attempts; successful confirmation consumes all tokens for that email, while failed delivery removes only the undelivered replacement.
- Feature-branch pushes and draft PRs are owner-authorized; never push protected branches, merge, deploy, touch production/Coolify/Creem/Resend accounts, or connect Prisma to Neon.

## Blockers

- None for local implementation. Release validation still needs real Resend configuration/domain and live Google/Microsoft credentials; this branch did not access those systems.

## Next action

- Review the draft PR and CI. When resolving its expected conflicts, retain the Semgrep merge-base fix from PR #37, the Lifetime queue/worker/CI changes from PR #38, and the hidden-AI-count/pricing changes from PR #35; then run the token gate introduced by the design-completion dependency.
