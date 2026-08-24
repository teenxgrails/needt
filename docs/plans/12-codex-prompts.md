# 12a — Codex prompts

Ready-to-paste prompts for the queue in
[`12-remaining-work.md`](12-remaining-work.md). One prompt per Codex session, in
this order. Each is self-contained: it names its own branch, its own gates and
its own done-condition, so a session that dies mid-way can be restarted from the
same text plus the handoff it wrote.

Every prompt assumes the agent starts by following [`../../BOOTSTRAP.md`](../../BOOTSTRAP.md).
Do not paste two of these into one session — one workstream, one worktree, one
branch, one handoff.

**Before the first session:** `docs/plans/11-task-model.md` and
`docs/plans/12-remaining-work.md` are untracked. Commit them, or an agent will
read a plan that is not in git.

---

## 1 — P0.1 · Make the admin credentials screen reachable

Blocks everything user-facing. Run this first.

```
Follow BOOTSTRAP.md first, in order.

Task: P0.1 in docs/plans/12-remaining-work.md.

`src/components/settings/SystemSettings.tsx` and
`src/app/api/system-settings/route.ts` both exist, but no page renders that
component. Verify this yourself with `git grep -n SystemSettings -- src/` before
you change anything — the component appears in the store, the types, the API
route and one test, and in no page under `src/app/(app)/`. It is unreachable
code, which means the Google and Outlook client secrets in the `SystemSettings`
model cannot be entered through the product at all, and calendar connection is
the core of the product.

Branch: codex/admin-system-settings-route

Do:
1. Mount `SystemSettings.tsx` on an admin-only route at
   `src/app/(app)/admin/system/page.tsx`, alongside the existing
   `/admin/operations`. Use the same admin guard pattern that route already
   uses — `requireAdmin` on the server side, `AdminOnly` / `AccessDeniedMessage`
   in the UI. Do not invent a second admin pattern.
2. Give it a navigation entry wherever `/admin/operations` is reachable from, so
   an admin can find it without typing the URL.
3. Add a UI-contract assertion in the existing `npm run check:ui-contracts`
   harness: every component under `src/components/settings/` that is rendered
   only behind `AdminOnly` must have at least one page importing it. This class
   of defect — shipped component, no route — must fail a gate from now on.
4. Add a unit test asserting `/admin/system` requires an admin session and that
   a non-admin gets the access-denied path, not the form.

Do not: change the `SystemSettings` Prisma model, change the API route's
contract, add credential fields, or touch anything under `src/app/api/calendar/`.

Gates: npm run type-check · npm run lint · npm run test:unit ·
npm run check:ui-contracts · npm run build · npm run test:e2e

Done when: an admin user can open /admin/system on a running dev server and see
the Google/Outlook credential form, a non-admin cannot, and
`npm run check:ui-contracts` fails if the route is deleted. Prove the last one
by deleting the route locally, watching the check fail, and restoring it.

Write the handoff before you run low on context.
```

---

## 2 — P1.1 · Merge the visual-baseline PRs

Fifteen minutes. Do not bundle it with anything else.

```
Follow BOOTSTRAP.md first, in order.

Task: P1.1 in docs/plans/12-remaining-work.md.

Two open PRs on teenxgrails/needt:

- #21 `codex/visual-baseline-ci-authority` — workflow_dispatch job,
  scripts/update-visual-baselines.ts, scripts/visual-baseline-update-guard.ts,
  two new tests, and one hunk that must NOT land as written.
- #22 `codex/linux-visual-baselines-20260824` — 41 files, every one a
  `tests/visual/**/*-linux.png`, zero code. Confirm that yourself with
  `git diff --name-only origin/main origin/codex/linux-visual-baselines-20260824 | grep -v -- '-linux\.png'`
  — it must print nothing.

Do, in this order:
1. Merge #22 first.
2. On #21, before merging, revert this hunk in `.github/workflows/ci.yml`. The
   `Enforce visual gate` step currently becomes:
       run: echo "::warning::Visual/style drift is temporarily non-blocking…"
   Restore it to:
       run: exit 1
   #21 was written while the Linux baselines were broken. #22 fixes them, so the
   reason for disabling the gate no longer exists. A temporary disablement that
   lands after the fix is how a gate dies permanently.
3. Re-run CI on #21 after that change. It must be green including `visual-style`
   against the freshly merged baselines. If it is not green, stop and report
   which spec drifts — do not re-disable the gate and do not update a baseline
   to make it pass.
4. Merge #21.

Everything else in #21 is sound: keep workflow_dispatch, both scripts and both
tests unchanged.

Note for later, record it in the handoff: the dispatch job refuses to run when
the target branch already exists on the remote, and the `target_branch` input
defaults to `codex/linux-visual-baselines` with no date suffix. The next
baseline refresh must pass a dated name.

Done when: both PRs merged, `origin/main` CI green, and
`grep -n 'exit 1' .github/workflows/ci.yml` shows the Enforce visual gate step
on main.
```

---

## 3 — P0.3 · Stop push reminders failing silently

The keys themselves are owner-only. The silence is not.

```
Follow BOOTSTRAP.md first, in order.

Task: P0.3 in docs/plans/12-remaining-work.md.

`src/services/reminders/reminder-delivery.ts:91-94`:

    const subject = process.env.VAPID_SUBJECT;
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!subject || !publicKey || !privateKey) return false;

Production has only NEXT_PUBLIC_VAPID_PUBLIC_KEY. So a user enables push
reminders, the UI confirms it, and nothing ever arrives — with no log line, no
Sentry event and no surfaced state. The missing key is the owner's to set; the
silence is a code defect.

Branch: codex/push-config-visibility

Do:
1. Replace that silent `return false` with a `logger.warn` naming exactly which
   of the three variables are absent. Use the repo's `logger` from `@/lib/logger`
   with a `LOG_SOURCE` constant — never console. Log the variable NAMES only,
   never any value.
2. Log it once per process, not once per reminder — a misconfigured deployment
   must not flood the log with one line per delivery attempt.
3. Surface the state where a user can act on it: the reminder/notification
   settings UI should say push delivery is unavailable when the server is not
   configured, instead of confirming a subscription that will never deliver. Add
   a server-side field for this to whatever settings endpoint already feeds that
   screen — do not expose any key material to the client, only a boolean.
4. Add unit coverage for both branches: fully configured, and each variable
   missing in turn.
5. Add VAPID_PRIVATE_KEY and VAPID_SUBJECT to the production env checklist in
   docs/deploy.md §3, marked required for push delivery, with a one-line note
   that the public key already deployed must belong to the same pair.

Do not: generate or commit any VAPID key, change the push payload format, or
touch the service worker.

Gates: npm run type-check · npm run lint · npm run test:unit · npm run build ·
npm run build:worker

Done when: starting the worker without VAPID_PRIVATE_KEY produces exactly one
warning naming the missing variables, the settings screen reports push as
unavailable, and both are covered by tests.
```

---

## 4 — P1.3 · Close the three stale handoffs

Twenty minutes. Safe to run right after prompt 3 in the same sitting.

```
Follow BOOTSTRAP.md first, in order.

Task: P1.3 in docs/plans/12-remaining-work.md.

Three handoffs are still `status: blocked` while the work they describe has
merged. A blocked handoff that is actually done sends the next agent to re-solve
a solved problem — that already happened once, which is why plan 12 exists.

- .agents/handoffs/20260815-codex-delivery-audit.md
- .agents/handoffs/20260815-codex-mail-focused-splits.md
- .agents/handoffs/20260816-codex-release-boundary-audit.md

Branch: codex/close-stale-handoffs

For each one, establish the real outcome from git rather than from the handoff's
own text, then close it:

- `codex/sol-s11-contracts` and `codex/terra-t8-product-ui` are both ancestors of
  origin/main — verify with `git merge-base --is-ancestor` and record the merge
  commit SHA.
- `MailFocusedSplit` and `SavedView` are both present in
  `git show origin/main:prisma/schema.prisma` — record that as the evidence that
  T8.5 and S11 shipped.
- For the mail-focused-splits visual timeout specifically: confirm from the
  current `tests/visual/` suite and the latest green CI run whether the
  `secondary-surfaces` spec still times out on `/mail`. If it does, the handoff
  stays open with that as its single next action. If it does not, close it and
  say what fixed it.

Set each to `status: complete`, with the resolving SHA and a one-line outcome.
Do not delete them and do not rewrite their history sections.

Gates: npm run check:agent-handoffs · npm run lint

Done when: `npm run check:agent-handoffs` passes and no handoff in
.agents/handoffs/ has `status: blocked` unless its blocker is genuinely still
true today.
```

---

## 5 — P0.2 · Billing lifecycle, end to end

The big one. Two sessions is realistic.

```
Follow BOOTSTRAP.md first, in order.

Task: P0.2 in docs/plans/12-remaining-work.md.

Production has a real CREEM_API_KEY, a real CREEM_WEBHOOK_SECRET and three real
prod_* product IDs. `isCreemConfigured()` in src/lib/creem/config.ts requires
exactly those five values, all five are set, so /api/billing returns
`configured: true` and the `disabled` guards at
src/components/settings/BillingSettings.tsx:300 and :322 are open. The checkout
buttons are live in production right now, and `tests/billing.spec.ts` does not
exist. tests/entitlements.spec.ts covers plan gating only.

The failure this permits: a user pays, the webhook is missed or replayed, and
the entitlement is never granted, or never revoked after cancellation. That is a
refund and a chargeback, not a redeploy. Treat this as the highest-risk task in
the repo.

Branch: codex/billing-lifecycle-coverage

Do:
1. Query Context7 for Creem's CURRENT documented webhook behaviour — signature
   scheme, retry policy, event ordering guarantees, idempotency keys. Do not
   code from memory and do not trust the existing implementation as a
   specification. Record what you found, with the date, in the handoff.
2. Audit src/lib/creem/webhook-processor.ts and webhook-mapping.ts against that
   documentation. Report every divergence you find before fixing any of them.
3. Create tests/billing.spec.ts driven by RECORDED webhook payloads committed as
   fixtures — no live network calls, ever. Cover the full lifecycle:
   checkout → active → entitlement granted → cancel → grace → expiry →
   entitlement revoked → resubscribe. Include the LIFETIME path, which never
   renews and therefore never emits a renewal event.
4. Prove three properties with tests that fail if the property is removed:
   signature validation rejects a tampered body; a replayed webhook does not
   double-grant; out-of-order delivery does not leave a cancelled subscription
   active.
5. Confirm entitlements are enforced SERVER-side in src/lib/entitlements.ts for
   every gated action, and that a downgrade immediately closes access to shared
   workspaces — Needt has no seat billing, every member holds their own plan.
6. Define and implement the failed-payment path explicitly: what the user sees,
   what they keep, what they lose, and when. Write the decision into the handoff
   before implementing it.

Do not: change prices, create or modify anything in the Creem dashboard, call
the live Creem API, or alter the LIFETIME semantics.

Flag to the owner rather than deciding yourself: whether the Swiss-seller
tax/invoice fields are correctly configured in Creem. That is a business
decision.

Gates: npm run type-check · npm run lint ·
npm run test:unit -- --runInBand src/lib/creem src/lib/entitlements ·
npm run test:e2e -- tests/entitlements.spec.ts tests/billing.spec.ts ·
npm run build

Done when: a recorded test-mode purchase grants PRO, a recorded cancellation
revokes it, LIFETIME survives a renewal-less lifecycle, and every one of the
three properties in step 4 has a test that fails when the protection is removed.

If you cannot finish, say so plainly in the handoff and recommend emptying
CREEM_API_KEY in production until it is done — the UI already explains a
disabled checkout, and a closed till beats an unaudited one.
```

---

## 6 — P0.4 · Account deletion and data export

```
Follow BOOTSTRAP.md first, in order.

Task: P0.4 in docs/plans/12-remaining-work.md.

`src/app/api/export/` contains only `tasks`. `git grep` finds no deleteAccount,
no data-export and no account-deletion route anywhere in src/. Meanwhile
src/app/privacy/page.tsx is published on a live domain. Whatever that page
promises about deletion and portability, the code does not do.

Branch: codex/account-lifecycle

Do:
1. Read src/app/privacy/page.tsx and src/app/terms/page.tsx first and list every
   concrete promise they make about deletion, retention and portability. That
   list is the requirement — build to it, and record it in the handoff.
2. Implement full account data export: everything the user owns, not just tasks.
   A single downloadable archive, generated asynchronously through the existing
   BullMQ worker if it is large, with the download link delivered through the
   existing Resend path.
3. Implement account deletion honouring the S2 archive/tombstone semantics from
   docs/plans/02-workspaces.md. Soft-deleting objects stays. Deleting an ACCOUNT
   must actually remove personal data: profile, credentials, OAuth tokens, mail
   content, page content, moodboards, AI corpus entries. Shared-workspace
   objects that other members still depend on become authorless tombstones, not
   orphans that leak the deleted user's data.
4. Require re-authentication for deletion, and make it recoverable for a stated
   grace window before the irreversible step runs. Choose the window, state it
   in the UI, and enforce it in the worker.
5. Create tests/account-lifecycle.spec.ts covering both flows end to end,
   including the assertion that after deletion no row in any table still carries
   the deleted user's email or tokens.
6. Re-read privacy/page.tsx afterwards and list, in the handoff, every sentence
   that is still not true. Do not edit legal copy — that is owner-approved in
   P1.5.

Do not: introduce physical deletion of other users' content, weaken the
workspace isolation boundary, or export another member's private data as part of
one user's archive.

Migrations must be additive expand/contract. Never destructive.

Gates: npx prisma validate · npm run type-check · npm run lint ·
npm run test:unit · npm run test:e2e -- tests/legal-pages.spec.ts
tests/account-lifecycle.spec.ts tests/workspace-security.spec.ts ·
npm run build · npm run build:worker

Done when: a user can export everything they own and delete their account, the
deletion provably removes personal data, shared workspaces survive intact, and
the handoff lists every privacy-page sentence that still needs owner attention.
```

---

## 7 — P1.2 · First run on a clean database

Needs prompt 1 merged first — the calendar step cannot pass before credentials
can be entered.

```
Follow BOOTSTRAP.md first, in order.

Task: P1.2 in docs/plans/12-remaining-work.md. Prerequisite: P0.1 is merged and
Google credentials are configured. If they are not, stop and say so.

A new user's first 120 seconds decide whether they ever come back.
tests/e2e/auth.spec.ts exists; tests/onboarding.spec.ts does not.

Branch: codex/first-run-experience

Do:
1. Walk the real path on a CLEAN database: sign up → verify → land → connect a
   calendar → see a task scheduled. Write down every dead end, unexplained
   disabled control and silent failure before fixing anything, then fix them.
2. Audit the empty state of every primary route: Today, Calendar, Tasks,
   Projects, Focus, Pages, Moodboards, Mail. Each must tell the user what to do
   next. Seed nothing fake — if a screen is useless with zero data, the empty
   state IS the design.
3. Verify the OAuth failure paths: denied consent, revoked token, expired
   refresh, wrong account. Each needs a recoverable message, not a stack trace.
4. Verify the same path at 360px and 390px.
5. Create tests/onboarding.spec.ts covering the clean-database first run.

Do not: add a product tour, add fake sample data, or redesign any screen — this
is about dead ends and honest empty states, not visual identity. The design
track is plan 10 and is owner-gated.

Gates: npm run type-check · npm run lint ·
npm run test:e2e -- tests/e2e/auth.spec.ts tests/onboarding.spec.ts ·
npm run test:style · npm run build

Done when: a person who has never seen Needt reaches a scheduled task without
help, on desktop and on a phone, and tests/onboarding.spec.ts proves the path
stays walkable.
```

---

## After these

`P2.1` alerting, `P2.2` funnel signal, `P2.3` rollback rehearsal and `P2.4`
Sentry correctness in [`12-remaining-work.md`](12-remaining-work.md). Write their
prompts once P0 is clear — their shape depends on what the P0 work turns up.
