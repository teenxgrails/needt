# 09 — Public launch track

**Status:** active. This is the governing plan until Needt serves real users on
`use.needt.app`.

**Goal:** take the current green release from "locally verified" to "real paying
users signing up on production", then resume feature work.

Plans 01–05 are implemented. Plans 07 (Sol S1–S12) and 08 (Terra T1–T10) are
complete except the deferred S11/T8 items, which this plan sequences. Plan 06
remains research input only.

---

## The local Docker build gate is retired (2026-08-23)

**Do not block any task in this plan on a local `docker build`.**

`.github/workflows/docker-publish.yml` already builds the production image on
`ubuntu-latest` from the same `docker/production/Dockerfile`, via
`docker/build-push-action@v6`, passing `NEEDT_BUILD_SHA`. The local build is a
duplicate of a gate that already runs on infrastructure that is not the owner's
laptop.

Context: the owner's Mac ran out of disk (1.7 GB free of 245 GB). Docker Desktop's
BuildKit content store corrupted, its own "Clean up data" could not run because
that repair path depends on the dead build backend, and a fresh `Docker.raw`
immediately reserves ~18 GB. Two sessions were lost to this.

**New rule:** where this plan or `AGENTS.md` lists "production Docker build" in a
gate, that requirement is satisfied by a green `docker-publish` workflow run on
the same SHA. Run it locally only if CI cannot, and never as a precondition for
continuing local work.

Everything else in the Definition of Done stays exactly as it is.

## Standing rules for this track

- **One task, one reviewed commit.** Never bundle unrelated work.
- **One workstream, one worktree, one branch, one handoff.** Create the handoff
  from `.agents/handoffs/_TEMPLATE.md` before touching more than ~3 files.
- **Migrations are additive.** Expand/contract only. Never delete user data.
- **Definition of done** is `AGENTS.md`'s, not a shortened version.
- **Stop and ask the owner** only for: production secrets/credentials, external
  account actions (Google domain verification, Azure consent, Creem dashboard),
  the actual production deploy, legal copy approval, and design direction.
  Everything else in this plan is pre-authorized — see the autonomy block in
  `AGENTS.md`.

---

## L0 — Unblock the current release

**Prerequisite:** none. Start here. Nothing else in this plan may start first.

### L0.1 — Close the focused-Mail visual blocker

`.agents/handoffs/20260815-codex-mail-focused-splits.md` is still `blocked`: the
`secondary-surfaces` visual spec times out navigating `/mail` in the dev matrix,
while the production build compiles the route. T8.5 code itself is committed at
`2109bfc` and passed unit + standard E2E.

- Reproduce the timeout, then decide: fix the dev-matrix navigation or run this
  spec through `NEEDT_VISUAL_PRODUCTION_SERVER=1` like the rest of the matrix.
- Inspect the visual diff by hand before touching any baseline.
- Mark the handoff `complete` with the evidence.

```bash
NEEDT_VISUAL_PRODUCTION_SERVER=1 npm run test:visual -- tests/visual/secondary-surfaces.spec.ts
NEEDT_VISUAL_PRODUCTION_SERVER=1 npm run test:visual
```

### L0.2 — Purge non-production artifacts from the working tree

The primary checkout carries changes that must never reach a production image.

- **`src/app/layout.tsx` — the Figma capture script is a launch blocker.**
  `https://mcp.figma.com/mcp/html-to-design/capture.js` currently loads
  `afterInteractive` on *every* page, including authenticated ones. Shipping a
  third-party script into authenticated Needt sessions is unacceptable. Gate it
  behind an explicit dev-only condition (`process.env.NODE_ENV !== "production"`
  **and** an opt-in env flag such as `NEEDT_FIGMA_CAPTURE=1`), so the production
  bundle never emits the tag. Do not simply delete it — the owner still uses the
  capture workflow locally.
- Add a UI-contract or build assertion that fails if the tag appears in a
  production build.
- `.gitignore` the local-only noise: `.playwright-mcp/`, `.claude/settings.local.json`,
  stray screenshots such as `pages-mobile-slash-390.png`.
- `.codex/config.toml` stays as the owner configured it.

**Done when:** a production `npm run build` output contains no `mcp.figma.com`
reference, and `git status --short` shows only intentional files.

```bash
npm run build
grep -r "mcp.figma.com" .next/ && exit 1 || echo "clean"
npm run check:ui-contracts
```

### L0.3 — Integrate the deferred S11/T8 release branches

`codex/sol-s11-contracts` (`a180003`) and `codex/terra-t8-product-ui`
(`44d225f`…`e0a1dc2`) are complete but unmerged. The read-only audit in
`.agents/handoffs/20260816-codex-release-boundary-audit.md` found conflicts in
`CHANGELOG.md` and `playwright.config.ts`, and independent `prisma/schema.prisma`
changes on both lines.

- Create an isolated worktree/branch for the integration. Do not merge in place.
- Resolve conflicts manually. **Retain** the current `AiConversation`,
  `AiMessage` and `AgentMemory` workspace fields, and the `WATCHPACK_POLLING`
  E2E workaround in `playwright.config.ts`.
- The deferred branch ships Saved Views, reschedule-preview, capacity and
  project-health surfaces with only narrow unit coverage. **Add Playwright
  coverage for every new user journey before merging** — this is not optional.
- Run the full T10 → S12 gate sequence on the integration SHA.

**Risk:** high. Two schema lines converging.

```bash
npx prisma validate
npm run type-check
npm run lint
npm run test:unit
npm run test:e2e
npm run check:branding
npm run check:ui-contracts
npm run check:agent-handoffs
npm run test:style
NEEDT_VISUAL_PRODUCTION_SERVER=1 npm run test:visual
npm run build
npm run build:worker
npm run build:collaboration
npm run check:collaboration-runtime
docker build -f docker/production/Dockerfile .
```

### L0.4 — Consolidate handoffs and land a single release SHA

- Close every `blocked`/stale handoff with its real outcome.
- Merge the integration branch into the release line.
- Tag the SHA that will be deployed. Record it in the handoff and `CHANGELOG.md`.

**Done when:** one branch, one green SHA, no open handoff except this track's.

---

## L1 — Production readiness audit

**Prerequisite:** L0. May run in parallel with L2.

Needt already has Sentry (`instrumentation.ts`, `sentry.*.config.ts`), Resend,
rate limiting with `RATE_LIMIT_HASH_SECRET`, `/api/health` with build SHA, and a
Coolify topology documented in `docs/deploy.md`. This task verifies each is
actually production-correct rather than merely present.

1. **Sentry.** Confirm release tagging matches `NEEDT_BUILD_SHA`, source maps
   upload, and PII scrubbing (no mail bodies, page content, tokens, emails in
   breadcrumbs or extra context). Verify the worker and collaboration processes
   report separately and are distinguishable.
2. **Rate limiting.** Confirm production is fail-closed when Redis is
   unreachable, and that auth, billing-webhook and AI routes have distinct,
   sensible budgets. Add a test proving the fail-closed path.
3. **Health and rollback.** `/api/health` returns `{ok, db, buildSha}` and fails
   when migrations are pending. Confirm required web, worker, and collaboration
   deployment hooks and health URLs fail the job when missing; the workflow
   records the prior healthy web SHA, waits for all three services at the new
   SHA, then provides manual Coolify rollback instructions on failure. There is
   no rollback hook and no automatic rollback.
4. **Secrets.** Confirm no secret reaches a Docker build arg or image layer.
   Produce the exact production env checklist for the owner from `docs/deploy.md`
   §3 plus `RATE_LIMIT_HASH_SECRET`, `SENTRY_DSN` and the VAPID trio.
5. **Backups.** Execute the restore drill in `docs/operations-runbook.md` and
   record the date, duration and verified row counts. A launch without a proven
   restore is not a launch.
6. **Logs.** Verified 2026-08-23: Docker json-file rotation is active at 10 MB
   × 3 files, observed `.log.1` proves rotation, and container logs totalled
   34 MB. Request-log sanitization and PII removal cover mail content, page
   content, and tokens; retain the dated evidence in the launch handoff.

### L1.8 — Registration email-verification policy

The schema already has `User.emailVerified` and `VerificationToken`, but public
registration does not issue a verification token, credentials login does not
enforce the field, and the signup UI signs a new account in immediately.

Before launch, the owner must choose one policy and scope it as a separate auth
release: either implement verified credentials signup plus a compatibility
backfill for existing credentials accounts, or consciously retain password-only
signup and leave `emailVerified` unused. Do not ship a partial gate that locks
out existing users.

**Done when:** each of the six items has a dated verification line in the handoff
and, where testable, an automated test.

```bash
npm run test:unit -- --runInBand src/lib/security src/services/operations
npm run test:e2e -- tests/workspace-security.spec.ts
docker build -f docker/production/Dockerfile . && docker history --no-trunc <image> | grep -iE "secret|key|token" && exit 1 || echo "clean"
```

### L1.7 — Owner-blocked external prerequisites

Not implementable by an agent. Produce a single checklist for the owner and stop:

- Google domain verification (required for realtime Google webhooks).
- Microsoft Graph admin consent (required for realtime Outlook webhooks).
- Production OAuth redirect URIs registered exactly as in `docs/deploy.md` §5.
- Creem production product IDs and API key.
- DNS for `use.needt.app` and the collaboration `wss://` subdomain.

Polling sync stays the supported fallback until webhooks are approved. Do not
block launch on webhooks.

---

## L2 — Billing must actually take money

**Prerequisite:** L0. May run in parallel with L1.

The Billing screen currently renders "Checkout buttons become available after the
Creem product IDs and API key are configured". Until that is false in production,
Needt cannot convert a single user. Creem client, webhook processor, mapping and
config already exist under `src/lib/creem/`.

- Verify webhook signature validation, replay protection and idempotency against
  Creem's current documented behavior (query Context7 first — do not code from
  memory).
- Cover the full lifecycle end to end: checkout → active → entitlement granted →
  cancel → grace/expiry → entitlement revoked → resubscribe. Include the
  LIFETIME path, which has no renewal.
- Confirm entitlements are enforced **server-side** in `src/lib/entitlements.ts`
  for every gated action, and that a downgrade immediately closes access to
  shared workspaces per the non-seat-based model.
- Define and implement the failed-payment path: what the user sees, what they
  keep, what they lose, and when.
- Confirm the customer portal link works and that tax/invoice fields required for
  a Swiss-resident seller are present in the Creem configuration (flag to owner
  if not — this is a business decision, not a code one).

**Risk:** critical. A billing bug is a refund and a chargeback, not a redeploy.

**Done when:** a Creem test-mode purchase grants PRO, a test-mode cancellation
revokes it, and both are covered by automated tests using recorded webhooks.

`tests/entitlements.spec.ts` exists and covers plan gating. A billing lifecycle
E2E spec does **not** exist yet — create `tests/billing.spec.ts` as part of this
task, driven by recorded Creem webhook payloads rather than live network calls.

```bash
npm run test:unit -- --runInBand src/lib/creem src/lib/entitlements
npm run test:e2e -- tests/entitlements.spec.ts tests/billing.spec.ts
npm run type-check
npm run lint
```

---

## L3 — First-run experience

**Prerequisite:** L0. Complements T7.6, which shipped searchable settings and the
account → calendar → workspace → first-task checklist.

A new user's first 120 seconds decide whether they ever come back.

- Walk the real signup path on a clean database: sign up → verify → land →
  connect a calendar → see tasks scheduled. Fix every dead end, unexplained
  disabled control and silent failure on that path.
- Every primary route must have a purposeful empty state that tells the user what
  to do next — not a blank canvas. Audit: Today, Calendar, Tasks, Projects,
  Focus, Pages, Moodboards, Mail.
- Seed nothing fake. If a screen is useless with zero data, the empty state is
  the design.
- Verify the OAuth failure paths: denied consent, revoked token, expired refresh,
  wrong account. Each needs a recoverable message, not a stack trace.
- Verify 360px and 390px mobile on that same path.

**Done when:** a person who has never seen Needt reaches a scheduled task without
help, on desktop and on a phone.

`tests/e2e/auth.spec.ts` exists. There is no onboarding spec yet — create
`tests/onboarding.spec.ts` covering the clean-database first-run path as part of
this task.

```bash
npm run test:e2e -- tests/e2e/auth.spec.ts tests/onboarding.spec.ts
npm run test:style
npm run type-check
npm run lint
```

---

## L4 — Legal and account lifecycle

**Prerequisite:** L0. `src/app/terms/page.tsx` and `src/app/privacy/page.tsx`
exist; T1 flagged that the copy needs owner review before release.

- Present the current legal copy to the owner for approval. **Do not write or
  finalize legal text autonomously.** Flag concretely what must be decided:
  controller identity, hosting jurisdiction, subprocessors (Coolify VPS, Resend,
  Sentry, Creem, Google, Microsoft, the AI provider), retention periods.
- Implement account deletion and data export as a user-facing flow, honoring the
  archive/tombstone semantics from S2 — deletion of an *account* must actually
  remove personal data even though object deletion is soft.
- Confirm the AI corpus retention rules stated in `NEXT_AGENT.md` are enforced in
  code: opt-out respected, personal workspace only, shared workspaces/mail/
  attachments/provider payloads excluded. Dataset export and training remain
  **off** pending owner legal review.

**Done when:** a user can export and delete their account, and the privacy page
matches what the code actually does.

`tests/legal-pages.spec.ts` exists. Create `tests/account-lifecycle.spec.ts` for
the export/delete flows.

```bash
npm run test:unit -- --runInBand src/app/api/export src/app/api/account
npm run test:e2e -- tests/legal-pages.spec.ts tests/account-lifecycle.spec.ts
```

---

## L5 — Release rehearsal

**Prerequisite:** L0–L4 green.

Run `docs/release-gate.md` end to end against a **staging** Coolify environment
that mirrors production, before touching production.

- Deploy web from the green SHA; wait for entrypoint migrations; confirm
  `/api/health` reports that exact SHA; then deploy worker and collaboration.
- Confirm all three services report the same SHA.
- Execute the full smoke list: signup, every entitlement fixture, scheduling,
  Start Now, Focus, Today/Pages fallback, provider sync, booking, reminders,
  360px mobile.
- Rehearse the manual Coolify rollback with a timer; record the elapsed time in
  this plan and the release handoff. Automatic rollback remains deliberately
  unsupported.
- Inspect Sentry, `/admin/operations`, cron cursors, queue age/depth, the
  scheduling reaper, log cleanup, backup retention and Web Push expiry.

**Done when:** the rehearsal passed once with zero manual intervention, and the
runbook reflects any step that turned out to be wrong.

**Owner action:** production deploy itself. Hand over the SHA, the env checklist
from L1.4, and the smoke list. Do not deploy production autonomously.

---

## L6 — Launch-day and first-week operations

**Prerequisite:** L5 and the owner's production deploy.

- Add alerting, not just monitoring: page the owner on health-check failure,
  error-rate spike, queue depth growth, failed migrations and webhook failures.
- Add a lightweight, privacy-respecting funnel signal — signup → calendar
  connected → first scheduled task → day-2 return. Aggregate only; no
  third-party analytics SDK without owner approval.
- Keep a running launch-issues handoff. Triage: anything blocking signup,
  payment or data integrity is a same-day fix; everything else queues.
- Do not start L7 while a P0/P1 from launch is open.

---

## L7 — Post-launch product work

**Prerequisite:** production stable for one full week with no open P0/P1.

Resume the deferred plan 06 / S11 / T8 items, each as an independent release with
its own contract-then-UI pair, in this order:

1. Capacity, workload, schedule explanation and reversible what-if preview.
2. Personal/workspace Saved Views.
3. Project health, update history and stale-update rules.
4. Flexible habits and weekly focus targets on the deterministic scheduler.
5. Meeting-note proposals requiring explicit approval before mutations.

Plan [11 — Task shape and starting friction](11-task-model.md) queues here too:
T-1 (progress counter and part-cut) is a self-contained release that may run
alongside the list above; T-2 (mini-entry) is gated on T-1 plus a prompt-quality
check; T-3 (streaks) is blocked on an open design question and does not ship.

Still not authorized: a new AI scheduler, seat billing, cross-workspace views,
third-party document storage, physical deletion of user content, read receipts,
team snippets, Notion-style automation, portfolio management, audio
transcription, new integrations.

Remaining technical debt from plan 06 that survives into this phase: isolated
major dependency upgrades (Next, MSAL, Google APIs, the Excalidraw/Mermaid
chain). Each is its own branch and its own release. Never `npm audit fix --force`.

---

## L8 — Design track (owner-gated, runs alongside)

**Status:** direction undecided as of 2026-08-22. The Figma Make path did not
produce usable results. Do not start implementation work here on your own
initiative.

Captured baseline exists in Figma file `8AWth2ENxFUbIfa0rV9D4o`: eight primary
screens plus all sixteen Settings panels and their safe dialogs. Two captures
failed and need redoing (Mail `55:2`, Boards `59:2` — both are empty black
frames).

When the owner settles the direction, the work splits into:

- **L8.1** Navigation/sidebar rebuild against the chosen reference.
- **L8.2** Token reconciliation — the three-layer semantic system in
  `src/app/globals.css` is the target; the legacy shadcn HSL set is retired.
- **L8.3** Per-screen redesign, one screen per commit, visual baselines reviewed
  by hand.

The blanket "no glow / no backdrop blur" rule is retired (2026-08-16 owner
decision). Until a screen is actually redesigned, it keeps its current flat
appearance — do not retrofit effects speculatively.

---

## Sequencing summary

| Phase | Tasks | Gate to proceed |
|-------|-------|-----------------|
| Unblock | L0.1 → L0.2 → L0.3 → L0.4 | One green SHA, no open handoff |
| Harden | L1 ∥ L2 ∥ L3 ∥ L4 | All four green; L1.7 checklist with the owner |
| Rehearse | L5 | Staging rehearsal passed once, rollback proven |
| Launch | owner deploys → L6 | Production stable, alerting live |
| Grow | L7 | One week, no open P0/P1 |
| Design | L8 | Owner decides direction |
