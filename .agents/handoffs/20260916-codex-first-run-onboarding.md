---
id: 20260916-codex-first-run-onboarding
owner: codex
branch: codex/first-run-onboarding
status: active
updated: 2026-09-16T20:12:49Z
objective: Prove and repair the clean-database first run, honest primary-route empty states, recoverable OAuth failures, and 360/390px behavior.
---

## Scope

- Governing plan/spec: launch GOAL Phase 3.6 and `docs/plans/12-remaining-work.md` P1.2.
- In scope: `tests/onboarding.spec.ts`; signup/verification/landing; provider-boundary calendar connection stub; first scheduled task; primary-route empty states; recoverable OAuth failure messaging; 360px and 390px coverage.
- Out of scope: real provider credentials/network calls, product tours, fake sample data, screen redesign, production, deploy, Neon, and visual baseline updates.

## Completed

- Created the isolated branch/worktree from `origin/main` and read the governing P1.2 sources.
- Confirmed the GOAL supersedes the old credential stop: calendar connection must be stubbed at the provider boundary and disclosed in the PR.

## Working state

- Expected files: `tests/onboarding.spec.ts` plus only the minimal product/test support files proven necessary by the clean-database walk.
- Foreign changes that must remain untouched: the dirty primary checkout and every other worktree.

## Verification

- Passed: `npm run agent:context`; initial branch is clean.
- Not run / still required: focused onboarding/auth E2E, mobile/style checks, type-check, lint, unit, build, UI contracts, branding, handoff validation, diff check.

## Decisions and constraints

- Stub the calendar provider at the application/provider boundary; do not use Google/Microsoft credentials or external network calls.
- Seed no fake product data. Test-created user content is allowed only as an explicit user action in the journey.
- No production, Neon, deploy, `main`/`landing` push, PR merge, or baseline update.

## Blockers

- None.

## Next action

- Audit the current auth/onboarding paths, empty states, and OAuth error handling; turn only observed gaps into focused tests and fixes.
