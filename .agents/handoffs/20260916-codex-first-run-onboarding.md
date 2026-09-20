---
id: 20260916-codex-first-run-onboarding
owner: codex
branch: codex/first-run-onboarding
status: active
updated: 2026-09-20T21:45:00Z
objective: Prove and repair the clean-database first run, honest primary-route empty states, recoverable OAuth failures, and 360/390px behavior.
---

## Scope

- Governing plan/spec: launch GOAL Phase 3.6 and `docs/plans/12-remaining-work.md` P1.2.
- In scope: `tests/onboarding.spec.ts`; signup/verification/landing; provider-boundary calendar connection stub; first scheduled task; primary-route empty states; recoverable OAuth failure messaging; 360px and 390px coverage.
- Out of scope: real provider credentials/network calls, product tours, fake sample data, screen redesign, production, deploy, Neon, and visual baseline updates.

## Completed

- Created the isolated branch/worktree from `origin/main` and read the governing P1.2 sources.
- Confirmed the GOAL supersedes the old credential stop: calendar connection must be stubbed at the provider boundary and disclosed in the PR.
- Saved the inherited 20-file Phase 3.6 working set in `b2df758` before further edits.
- Fixed PR #39 E2E fixture compatibility in `294528f`; both E2E jobs are green.
- Added user-bound, one-time Google/Outlook OAuth state cookies and typed recovery redirects for invalid state, denied consent, missing codes, provider setup failure, and refresh-token reauthorization.
- Created default auto-scheduling settings during registration and OAuth provisioning.
- Added actionable first-run empty states for Calendar and Focus without showing false emptiness while data is loading or after a failed load.
- Added a 360/390px clean-database journey covering password signup on Free, verification and trial activation, provider-boundary calendar connection, recoverable consent denial, task creation, the real scheduling service boundary, and the scheduled Calendar result.
- Committed the completed Phase 3.6 work as `56aff62`, pushed `codex/first-run-onboarding`, and opened draft PR #42.

## Working state

- Expected dirty files: `.github/workflows/ci.yml` and this handoff while the
  CI E2E memory-restart fix is being verified.
- Foreign changes that must remain untouched: the dirty primary checkout and every other worktree.

## Verification

- Passed: `npm run agent:context`; `git diff --check`; Prettier; `npm run type-check`; `npm run lint`; `npm run test:unit` (181 suites, 858 tests); `npm run check:ui-contracts`; `npm run check:branding`; `npm run check:agent-handoffs`; `npm run build:worker`; individual 360px and 390px onboarding E2E runs.
- Build: the normal standalone build compiled and generated 131/131 pages twice, then failed during standalone trace-copy because the disk filled. `VERCEL=1 npm run build` passed, including the production-artifact check. Docker CI must prove the standalone packaging on the pushed SHA.
- `tokens:check` is not present on this branch; the design-port branch owns that gate.
- CI failure diagnosis: run `35462108027`, E2E job `105948131125`, shows
  repeated Next dev-server memory-threshold restarts followed by transient
  `ERR_CONNECTION_REFUSED` and whole-test retries. No onboarding assertion
  failed before the server disappeared.
- Current CI fix passed `npm run prisma:generate`, `npm run type-check`,
  `npm run lint`, `npm run check:agent-handoffs`, Prettier and
  `git diff --check`. A repeat local production build was stopped by host
  `ENOSPC`; CI is the authoritative production-build/E2E check for this change.

## Decisions and constraints

- Stub the calendar provider at the application/provider boundary; do not use Google/Microsoft credentials or external network calls.
- The browser journey proves the provider-start boundary and typed callback UI; callback state/session rules are exercised directly at the route boundary, while external Google/Microsoft token exchange remains intentionally stubbed.
- The local E2E Compose stack has no worker, so the journey executes the same `executeSchedulingRun` service boundary used by the worker after the API queues the run.
- Seed no fake product data. Test-created user content is allowed only as an explicit user action in the journey.
- No production, Neon, deploy, `main`/`landing` push, PR merge, or baseline update.

## Blockers

- The pushed SHA `eb0b685` fails the E2E job because the Next development
  server repeatedly reaches its memory threshold and restarts while the
  onboarding test visits every primary route. The test then sees transient
  connection refusals and retries the whole journey.

## Next action

- Run the E2E suite against the repository's existing production-server mode,
  push the verified fix, and confirm a new PR #42 CI run starts.
