---
id: 20260824-codex-push-config-visibility
owner: codex
branch: codex/push-config-visibility
status: active
updated: 2026-08-24T19:05:11Z
objective: Make missing VAPID configuration observable once per process and prevent the settings UI from offering unavailable push delivery.
---

## Scope

- Governing plan/spec: `docs/plans/12-remaining-work.md` P0.3 and prompt 3 in `docs/plans/12-codex-prompts.md`.
- In scope: reminder-delivery warning, notification-settings server boolean/UI state, focused tests, deploy checklist, changelog, required local gates, push, and PR.
- Out of scope: VAPID key generation, service-worker or payload changes, production/Coolify operations, deployment, and merge.

## Completed

- Created an isolated worktree from `origin/codex/plan12-coordination` at `f4b2400` and reviewed the required project context.
- Added a shared VAPID configuration reader, a once-per-process warning used at worker startup and delivery time, and secret-free availability responses from the notification settings API.
- Disabled the existing browser-notification switch with an explanatory state when push delivery is unavailable, without persisting the server-derived boolean or clearing the saved preference during an outage.
- Added configured/every-variable-missing tests, API/UI/worker startup contracts, deploy checklist guidance, and the unreleased changelog entry.
- Rebased the single scoped implementation commit onto `origin/main` at `40b9ecb`, then merged fresh `origin/main` at `0483d26` while preserving the prior PR head as an ancestor for the push-event security baseline.
- Opened PR #24 and made its notification screenshot fixture explicitly model a configured deployment with the seeded enabled preference while retaining every other real API response field; unavailable behavior remains covered by focused API/UI unit tests.

## Working state

- Files currently dirty or expected to change: `tests/visual/settings-tabs.spec.ts` and this handoff until the scoped visual-fixture follow-up commit.
- Foreign changes that must remain untouched: every file in `/Users/lol/Needt` and every pre-existing worktree/handoff.

## Verification

- Passed after the fresh `origin/main` rebase: `npm run type-check`; `npm run lint` with zero warnings; full `npm run test:unit -- --runInBand` (169 suites / 783 tests passed, 1 suite / 1 test skipped); `npm run build` (142 pages and 1,390 production artifacts); `npm run build:worker` (33.4 MB bundle).
- Also passed: `npm run agent:context`; active-handoff overlap review; focused unit tests (5 suites / 10 tests); direct Playwright visual collection (69 tests); `npm run check:agent-handoffs` (24 handoffs); `git diff --check`.
- Historical CI diagnosis: the first new-branch push had a zero baseline SHA, then the rebased force-push compared non-ancestor heads; both Semgrep runs surfaced unchanged repository findings while each corresponding PR diff scan passed. The visual job found the expected unavailable-state delta in notification settings plus an unrelated flaky Today scroll assertion; no baseline was changed.
- Final-SHA CI on `8c58026` passed changes, schema drift, quality gates, security, and E2E for both push and PR events. Visual failed only the deterministic notification screenshots because the fixture set availability true but retained the API-masked false enabled preference.
- Follow-up `f1eecc8` asserted both server boolean fields and attempted to override only `webPushConfigured` and `webPushEnabled`. Both CI events again passed changes, schema, quality, security, and E2E, but the received screenshots were byte-for-byte equivalent to the prior unavailable state: combining `response` with `json` in `route.fulfill` retained the fetched body instead of the JSON override.
- The pending correction now fulfills with the fetched status plus the spread real JSON fields and the two explicit booleans, without passing the original response body. Local `npm run lint`, `npm run type-check`, and `git diff --check` pass. No baseline changed.
- Not run / still required: commit and push the corrected fulfill call, then obtain fully green CI on the new SHA.

## Decisions and constraints

- Expose only a server-computed boolean; never return VAPID values or generate keys.
- The warning must name missing environment variables only and be emitted once per process.
- Do not touch push payloads or the service worker.
- The coordinator narrowed final verification to code-only; no production or configuration service was contacted, and the blocked Docker-based browser fixture was abandoned without changing product data.

## Blockers

- None.

## Next action

- Commit and push the corrected visual-fixture fulfill call, then monitor PR #24 to fully green CI.
