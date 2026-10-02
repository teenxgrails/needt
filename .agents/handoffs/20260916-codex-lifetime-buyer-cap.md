---
id: 20260916-codex-lifetime-buyer-cap
owner: codex
branch: codex/lifetime-buyer-cap
status: complete
updated: 2026-09-16T10:26:00Z
objective: Close Lifetime checkout after 300 buyers without exposing counts or overselling under concurrency.
---

## Scope

- Governing plan/spec: GOAL Phase 3.1 third PR and item 8 in `/Users/lol/Needt-handoff/2026-09-15-docs-refresh/files/docs/plans/13-pricing.md`.
- In scope: concurrency-safe Lifetime capacity/reservations, checkout and webhook enforcement, boolean availability UI/API, reconciliation, additive schema/migration, tests, changelog, draft PR to `main`.
- Out of scope: prices/token metering (PR #35), hosted AI soft limit (PR #36), trial, model-name live call, landing, production/Coolify/Creem changes, deploy, protected-branch push, merge, Neon.

## Completed

- Created a clean worktree from `origin/main` at `72eeef6`.
- Added an additive `LifetimeCheckoutReservation` model and migration with one durable hold per user and stable provider request IDs.
- Enforced the 300-buyer boundary in a serializable transaction protected by a PostgreSQL advisory lock; all existing `LIFETIME` subscriptions and open holds occupy capacity.
- Reserved capacity before Creem checkout creation, reused the same hold and checkout URL on retries, and exposed only a boolean availability flag to the billing UI.
- Required every signed Lifetime completion to match a reservation and consumed the hold atomically with the subscription grant; unmatched legacy/direct checkouts are rejected for review instead of overselling.
- Added a BullMQ reconciliation worker that retries ambiguous `CREATING` calls with Creem's stable `requestId`, retains pending holds, consumes completed checkouts through the shared webhook processor, and releases only provider-confirmed expired checkouts.
- Added route, service, webhook, reconciliation, UI-contract, and real PostgreSQL concurrency coverage. CI now opts the integration test into the unit gate.
- Applied all 100 migrations to the isolated local PostgreSQL container at `postgresql://fluid:fluid@127.0.0.1:5432/fluid_calendar`; Neon and production were never contacted.
- Sol/Terra audits covered concurrency, recovery, and webhook binding; Terra's final re-review found no regression after the three critical fixes.

## Working state

- Files currently dirty or expected to change: the completed scoped changes listed above, ready for one explicit-path commit.
- Foreign changes that must remain untouched: none in this worktree.

## Verification

- Passed: `npm run agent:context`; initial `git status --short` empty.
- Passed: `npx prisma format`, `npx prisma generate`, `npx prisma validate`, local `prisma migrate deploy`, and `prisma migrate status` (`Database schema is up to date!`).
- Passed: real PostgreSQL race at 299 occupied slots plus two simultaneous reservations; exactly one was admitted and capacity ended at 300. The expected first-attempt Prisma `P2034` conflict was retried successfully.
- Passed: `npm run type-check`; `npm run lint` with zero warnings.
- Passed: `LIFETIME_CAP_INTEGRATION=1 npm run test:unit -- --runInBand` — 173 suites passed, 1 skipped; 827 tests passed, 1 skipped.
- Passed: `npm run build:worker` — worker bundle 33.9 MB.
- Passed: `npm run check:ui-contracts` — 477 product files; `npm run check:branding` — 945 files; `npm run check:agent-handoffs` — 28 handoffs.
- Passed: `npm run build` — 142 pages and 1393 production artifacts; `git diff --check`.

## Decisions and constraints

- Branch is independent from PRs #35 and #36 and starts directly from `origin/main`.
- Feature-branch pushes and draft PRs are owner-authorized; never push protected branches, merge, deploy, touch production/Coolify/Creem, or connect Prisma to Neon.
- Lifetime availability is boolean only; no remaining-spots count is user-visible.
- Capacity is fail-closed: active Lifetime subscriptions plus `CREATING` and `PENDING` holds count toward 300, refunds/disputes do not automatically reopen a slot, and no local TTL guesses that a provider checkout expired.
- Ambiguous checkout creation is recovered by replaying the exact stable Creem `requestId`; a late webhook cannot reopen a consumed hold.
- Already-issued direct Creem checkout URLs cannot be invalidated through the documented API. An unmatched completion is rejected and requires manual review/refund; production behavior remains an owner/external validation item.
- PR #37 should merge first. When resolving `.github/workflows/ci.yml`, retain both its Semgrep merge-base fix and this branch's opt-in for the Lifetime PostgreSQL integration suite.
- Known CI state: Semgrep on feature PRs is affected by the baseline bug fixed in PR #37; `visual-style secondary-surfaces` is already red on `main`; `visual-style settings-tabs` baselines are intentionally deferred until after Phase 4.

## Blockers

- None.

## Next action

- Commit and push the scoped branch, open a draft PR to `main`, then start GOAL Phase 3.2 trial work in a new clean worktree.
