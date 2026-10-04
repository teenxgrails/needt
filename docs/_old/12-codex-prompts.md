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

## Fix round 1 — 2026-08-24

Prompts 1, 3 and 5 produced PRs #24, #26 and #27. An independent audit found all
three unmergeable. Prompts 2 and 4 landed clean and are merged (`eb81407`,
`c3e7a11`, `0483d26`); the `Enforce visual gate` step on `main` is back to
`run: exit 1`, verified.

Each fix prompt below replaces the original for that branch. Run them in the
same one-session-one-branch discipline. Every finding in them was reproduced,
not inferred — the audit ran the ui-contracts script against an extracted tree,
built a Next 15.5.23 probe to confirm the SSR crash, deleted guards to check
whether tests actually fail, and traced the store's PATCH payload through Prisma.

---

### Fix 1 — PR #24 · admin route

```
Follow BOOTSTRAP.md first, in order.

Branch: codex/admin-system-settings-route (PR #24). An independent audit found
five defects. Do not open a new branch — fix these in place.

1. THE PAGE THROWS DURING SSR AND ONLY SURVIVES BECAUSE AN ERROR BOUNDARY
   CATCHES IT.
   src/components/settings/SystemSettings.tsx dereferences
   `window.location.origin` at lines 115, 116 and 189 inside `description`
   props. Those are JSX expressions in the argument list, so they evaluate when
   `SystemSettings()` returns — before `<AdminOnly>` (line 77) decides anything.
   The branch adds "use client" at line 1 and the new Server Component page
   renders `<SystemSettings />` directly, so Next pre-renders it on the server
   where `window` is undefined → `ReferenceError: window is not defined`.
   This does NOT produce a hard 500, because `src/app/error.tsx` is a root
   client error boundary: React catches the SSR throw, ships the boundary, and
   recovers on the client where `window` exists. That is why
   `tests/admin-system.spec.ts` passes and why your handoff's browser
   verification is accurate — I was wrong to doubt it, and this prompt
   originally said the route 500s. It does not.
   What it actually costs on every load: a thrown error into `logger` from
   error.tsx (so Sentry noise per page view), the loss of SSR for the whole
   subtree, and a visible flash of the error UI before client recovery.
   FIX: compute the origin in a `useEffect` into state, or guard with
   `typeof window !== "undefined"`. Then confirm the fix by loading
   /admin/system on a running `next dev` and checking the SERVER terminal — the
   `ReferenceError` line must be gone. A green Playwright run does not prove
   this, because the boundary hides it; paste the clean server log instead.

2. YOU REMOVED THE MIDDLEWARE ADMIN GUARD. src/middleware.ts:27 and :130-136 add
   `serverGuardedAdminRoutes` and `return NextResponse.next()` for non-admins.
   The task said use the SAME pattern as /admin/operations — that pattern is
   three layers: middleware redirect, API `requireAdmin`, and `AdminOnly`. You
   dropped layer 1 and replaced it with a page guard. The match at :132 is
   `pathname === route || pathname.startsWith(route + "/")`, so it exempts the
   entire future /admin/system/* subtree. Restore the middleware guard and keep
   the page guard as well. Cosmetic access-denied copy is not worth a removed
   boundary.

3. THE PAGE GUARD IS WEAKER THAN requireAdmin, and the handoff overstates it.
   `isAdmin()` (src/lib/auth/is-admin.ts:16) reads `session.user.role` from the
   JWT. `requireAdmin` re-reads `role` AND `isActive` from the database on every
   call. A demoted or deactivated user holding a valid JWT renders the admin
   shell. No credentials leak because /api/system-settings still uses
   DB-backed requireAdmin — but fix the claim in the handoff, and add the
   `isActive` check to the page path.

4. THE UNIT TEST ASSERTS SOURCE TEXT, NOT BEHAVIOUR.
   src/__tests__/admin-system-page.test.ts:24-38 readFileSync's page.tsx and
   regex-matches it. It passes if `isAdmin()` is changed to return true, and it
   passed while the route 500s. Replace it with a test that renders the page
   with a mocked non-admin session and asserts the access-denied path, and with
   a mocked admin session and asserts the form. The required property is: the
   test fails when the guard is removed.

5. THE UI-CONTRACTS CHECK HAS THREE HOLES. It is not vacuous — deleting page.tsx
   correctly produces 3 failures — but:
   - scripts/check-ui-contracts.mjs:144-145 matches the import STRING, so a
     COMMENTED-OUT import satisfies it and the component is orphaned with a
     green gate. Match real usage, not a substring.
   - :131-136 only detects `<AdminOnly` plus that exact import path. CLAUDE.md
     sanctions the `useAdmin` hook equally; a component guarded that way is
     invisible to the check.
   - :138-146 false-FAILS on a relative-path import.
   Fix all three and prove each with a deliberately-broken fixture.

6. SCOPE: page.tsx:48-49 also mounts UserManagement and LogViewer, which the
   task did not ask for, and that forced "use client" onto
   src/components/settings/LogViewer/index.tsx:1. Consequence: the full user
   management surface and the log viewer now sit on the one route whose
   middleware guard you removed. Either keep them and restore the guard
   (defect 2 already requires that), or split them to their own commit with
   their own reasoning. Say which you chose and why.

PR numbering: this branch is PR #26, not #24 as an earlier note said. Go by
branch name, not by number.

Gates: npm run type-check · npm run lint · npm run test:unit ·
npm run check:ui-contracts · npm run build · npm run test:e2e

Done when: /admin/system renders for an admin with NO error in the server
terminal on `next dev` and on `next start`, a non-admin is redirected by
middleware, a deactivated admin is refused, and every added test fails when its
guard is deleted — prove that last one by deleting each guard in turn and
pasting the failure output.
```

---

### Fix 2 — PR #26 · push config

```
Follow BOOTSTRAP.md first, in order.

Branch: codex/push-config-visibility (PR #26). An independent audit found that
this branch destroys the exact user preference it was written to protect. Fix in
place.

1. DATA LOSS. src/app/api/notification-settings/route.ts:49 and :112 return
   `webPushEnabled: webPushConfigured && settings.webPushEnabled`. The store
   hydrates that masked value (src/store/settings.ts:454) and
   `updateNotificationSettings` PATCHes the WHOLE payload back on every change,
   including `webPushEnabled` (settings.ts:223), which route.ts:87 passes
   straight to Prisma. On an unconfigured server — production, today — a user
   who toggles ANY unrelated switch silently overwrites their stored
   `webPushEnabled: true` with `false`. When the private key is finally
   deployed, the preference is already gone.
   The audit proved this against the real handlers: GET with VAPID_PRIVATE_KEY
   unset returns false despite a DB row of true, and feeding that response
   through the payload the store builds yields
   `upsert({ update: { webPushEnabled: false } })`.
   You were aware of the hazard — it is why you used a raw `set(...)` during
   hydration at settings.ts:445-457 — but you only closed the init path, not the
   user-toggle path.
   FIX: return the UNMASKED preference alongside the new `webPushConfigured`
   boolean. The UI already computes `webPushConfigured && webPushEnabled` itself
   at NotificationSettings.tsx:144, so no UI change is needed. The masking was
   never necessary.

2. THE TEST PINS THE DEFECT IN PLACE.
   src/app/api/notification-settings/__tests__/route.test.ts:114 asserts
   `expect(body.webPushEnabled).toBe(false)` under the title "reports Web Push
   unavailable without clearing the saved preference". The title is false: the
   test never exercises the GET→store-payload→PATCH round trip that actually
   clears it, and removing the mask makes this test FAIL. Rewrite it as that
   round trip, asserting the stored preference survives.

3. THE VISUAL FIXTURE FABRICATES SERVER STATE.
   tests/visual/settings-tabs.spec.ts:54-71 intercepts /api/notification-settings
   and force-overrides `webPushConfigured: true, webPushEnabled: true`. Your own
   handoff gives the reason: the fixture set availability true but kept the
   API-masked false preference. So the visual gate now screenshots a state the
   server cannot produce, and the "push unavailable" UI — the actual deliverable
   — has ZERO rendered coverage. Once defect 1 is fixed the override is
   unnecessary. Remove it, and add a visual case that captures the unavailable
   state honestly.

4. THE VISUAL SUITE CANNOT PASS AGAINST THE UNCHANGED BASELINES. The committed
   settings-notifications-desktop-linux.png shows Browser notifications OFF and
   all four Calendar-alert toggles OFF. Your store change at settings.ts:450
   (`notifyFor: notificationSettings.notifyFor`) fixes a real pre-existing bug —
   main read flat fields the API returns nested, so notifyFor.* was undefined
   and rendered off; the DB defaults are true — so those four now render ON.
   That is five toggle-state deltas. Your handoff already admits green CI was
   never obtained. Re-baseline these screenshots honestly, by hand, after
   defects 1 and 3 are fixed. Do not mock the API to match an old PNG.

5. THE CORE REGRESSION IS UNTESTED. The audit deleted the warning call from
   `deliverPush` (src/services/reminders/reminder-delivery.ts:111-116),
   restoring the exact pre-branch silent `return false`, and ALL SUITES STILL
   PASSED. src/services/reminders/__tests__/reminder-delivery.test.ts only calls
   the two exported warn helpers directly; `deliverPush` is never invoked by any
   test. Add a test that invokes `deliverPush` with a missing variable and
   asserts both the warning and the false return.

6. TWO "TESTS" ARE SOURCE-TEXT MATCHERS. src/worker/__tests__/vapid-startup.test.ts:11
   asserts a whitespace-exact source literal — adding one comment inside
   `start()` fails the suite while proving nothing about execution.
   notification-settings-push-availability.test.ts greps the JSX for a copy
   string. Replace both with tests that execute or render.

7. UNDECLARED SCOPE. settings.ts:450-451 also fixes `defaultReminderTiming`
   being JSON.parse'd twice (turning [30] into the number 30). Probably correct,
   but it is not P0.3, has no test, and is absent from CHANGELOG.md. Either
   cover it and declare it, or split it out.

Clean and confirmed: no key material anywhere in the diff, log emits variable
names only through the repo logger, the once-per-process flag genuinely holds
across BullMQ job re-entry, and no baseline PNG was modified. Keep all of that.

Minor, fix while you are there: the flag at reminder-delivery.ts:15-16 is set
BEFORE `await logger.warn`, so a logger failure loses the message permanently.

Gates: npm run type-check · npm run lint · npm run test:unit · npm run build ·
npm run build:worker · npm run test:visual (reviewed by hand before any
baseline update)

Done when: a user's saved webPushEnabled survives toggling every other switch on
an unconfigured server, a test proves that round trip, `deliverPush` has
behavioural coverage that fails when the warning is removed, and the visual
baselines match what the real server renders.
```

---

### Fix 3 — PR #27 · billing lifecycle

```
Follow BOOTSTRAP.md first, in order.

Branch: codex/billing-lifecycle-coverage (PR #27). An independent audit found
three money-losing defects. This branch governs a checkout that is LIVE in
production right now. Fix in place, and treat every finding as a customer who
was charged and lost access.

1. A DEAD SUBSCRIPTION CAN REVOKE A LIVE ONE.
   src/lib/creem/webhook-processor.ts:113-137. The ordering cursor
   (`lastCreemEventAt` / `lastCreemEventId`) is stored PER USER ROW, not per
   Creem subscription, and subscription identity is compared only inside the
   equal-timestamp tie-break at :117-126. Outside it, identity is never checked.
   Failure sequence:
     1. User cancels sub_A, paid through 30 Mar. Row: ACTIVE, sub_A.
     2. 10 Mar they resubscribe → subscription.active(sub_B) at t2. CARD IS
        CHARGED. Row: ACTIVE, sub_B, period end 10 Apr, cursor t2.
     3. 30 Mar Creem emits subscription.expired(sub_A) at t3 > t2.
     4. Not older, not equal-time, not lifetime → applied.
     5. Row becomes CANCELED, sub_A, currentPeriodEnd null.
     6. effectiveSubscriptionPlan → FREE. A paying customer is 403'd out of
        every shared workspace while Creem keeps billing them.
   The mirror case also exists at equal timestamps: the tie-break at :121-123
   requires matching creemSubscriptionId, so a DIFFERENT id skips the guard
   entirely. Your handoff calls that bypass a feature ("a different subscription
   ID bypasses this tie-break so a legitimate resubscribe is not blocked") — it
   is also the hole. No test covers it.
   FIX: scope every restrictive mutation to the stored creemSubscriptionId, or
   key the ordering cursor per subscription. Add a test for the exact sequence
   above.

2. CANCELLING ERASES THE PAID-THROUGH DATE.
   webhook-processor.ts:172-179. `keepsPaidThroughDate` covers active, trialing,
   paid, past_due, unpaid and update — but NOT `subscription.canceled` or
   `subscription.scheduled_cancel`. Those map to CANCELED with
   currentPeriodEnd = whatever the payload holds, i.e. null when absent.
   entitlements.ts:102-110 requires a future currentPeriodEnd for CANCELED, so a
   user who paid on the 1st and cancels on the 5th drops to FREE instantly and
   loses 25 paid days — whenever Creem omits current_period_end_date. Your
   recorded fixture happens to include the field, so the grace-period assertion
   at tests/billing.spec.ts:197-217 proves nothing about the payload shape that
   breaks it. The fix is one string in that array; add a fixture without the
   field and assert the stored date survives.

3. THE LIFETIME E2E TEST NEVER TOUCHES THE BRANCH IT CLAIMS TO PROVE.
   tests/billing.spec.ts:331-367 builds the "unrelated Pro event" from
   recordedFixtures.proActive, which carries customer.id "cust_recorded_pro" and
   object.id "sub_recorded_pro", rewriting only metadata.referenceId. But
   webhook-processor.ts:93 is `existing?.userId || mutation.userId` and the
   findFirst OR at :68-80 matches the PRO user's row by customer id — so the
   event is applied to the Pro user, not the lifetime user. The test then
   asserts the LIFETIME row is unchanged, which is trivially true.
   DELETE THE ENTIRE lifetimePreserved BRANCH AND THIS TEST STILL PASSES.
   Give the lifetime fixture its own customer.id and re-prove the property.

4. CI RETRIES ARE STRUCTURALLY UNPASSABLE. Users are namespaced with runId
   (billing.spec.ts:25-27) but every fixture event id is a constant.
   tests/e2e/global-setup.ts does not reset the DB in CI, and
   playwright.config.ts sets retries: 2. On any retry every event is already in
   CreemWebhookEvent, all webhooks return replayed_event, the fresh user stays
   FREE, and the signature test's findUnique→toBeNull also fails. The first red
   run therefore produces two more red runs with a different, misleading
   failure. Namespace the event ids with runId too.

5. LIFETIME HAS NO EQUAL-TIME PROTECTION AT ALL. Lifetime rows store
   creemSubscriptionId = null (webhook-mapping.ts:179), so the condition at
   processor :121 is always false. They rely entirely on `lifetimePreserved`,
   which only blocks mutations whose plan is not LIFETIME — so any handled event
   carrying the configured lifetime product id (expired, paused, or an update
   with status canceled) maps to LIFETIME/CANCELED/null and permanently revokes
   a one-time purchase. Add an explicit guard.

6. `subscription.paused` → permanent revocation (webhook-mapping.ts:118-124,
   167-169): CANCELED with currentPeriodEnd null, immediate FREE, no grace, on a
   customer who has paid through the period. A dunning pause should not do that.
   It is not in the requirement and there is no un-pause path other than a
   subscription.active you may never receive. Decide deliberately and write the
   decision down.

7. The unit replay test at src/lib/creem/__tests__/billing.test.ts:214-240 forces
   createMany to return {count:0} on the second call. That asserts on a mock the
   test itself supplied and proves nothing. The e2e replay at
   billing.spec.ts:252-265 IS genuine — keep it, delete or rewrite the unit one.
   Note the only event ever replayed is a cancel, which is idempotent in effect;
   add a replay of a GRANT event, since "does not double-grant" is the property
   that was actually required.

Confirmed clean, keep all of it: signature validation is genuinely proven
end-to-end against the real route; idempotency is a real database primary key on
Creem's event id inside a Serializable transaction with P2034 retry, which holds
across replicas and restarts; the migration is additive-only, 21 lines, no drops
or rewrites; no live network calls, no real key or product id in any fixture;
entitlements resolve server-side on every call with no cache; shared-workspace
downgrade 403s immediately and honours the no-seat-billing model; pricing in
config.ts is untouched.

Gates: npx prisma validate · npm run type-check · npm run lint ·
npm run test:unit -- --runInBand src/lib/creem src/lib/entitlements ·
npm run test:e2e -- tests/entitlements.spec.ts tests/billing.spec.ts ·
npm run build

Done when: the sequence in defect 1 is a test that fails before your fix and
passes after; a canceled payload with no current_period_end_date keeps the paid
date; the lifetime test fails when lifetimePreserved is deleted; and the whole
suite passes twice in a row against a database that was not reset between runs.
```

---

## After these

`P2.1` alerting, `P2.2` funnel signal, `P2.3` rollback rehearsal and `P2.4`
Sentry correctness in [`12-remaining-work.md`](12-remaining-work.md). Write their
prompts once P0 is clear — their shape depends on what the P0 work turns up.
