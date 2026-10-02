---
id: 20260916-codex-pricing-ai-limits
owner: codex
branch: codex/pricing-and-ai-limits
status: complete
updated: 2026-09-16T00:50:47Z
objective: Align product prices and hidden hosted-AI accounting with the owner-approved launch decision.
---

## Scope

- Governing plan/spec: Phase 3.1 first PR in `/Users/lol/Needt-handoff/2026-09-15-launch-goal/GOAL.md` and items 1, 2, 4 and 6 in the docs-refresh `13-pricing.md`.
- In scope: Pro/Lifetime code prices, Lifetime hosted-AI allowance, removal and regression guard for all user-visible AI counts, additive input/output token accounting, local-only migration, tests, env docs, changelog, draft PR.
- Out of scope: soft-limit queue/ceiling (item 3), 300-buyer checkout cap (item 8), model-name production change/live key call, trial, landing, Neon, production/Coolify, deploy, protected-branch push, merge, final legal copy.

## Completed

- Created a clean worktree from `origin/main` at `72eeef6`.
- Updated code prices to Pro monthly $7, Pro yearly $60, Lifetime $149.
- Aligned the default Lifetime hosted-AI cap with Pro at 300 and updated both env templates.
- Removed all visible hosted-AI usage counts and added a source-level UI contract guard.
- Added additive `AiUsage.inputTokens` / `outputTokens` counters and provider-level hosted usage capture for OpenAI-compatible and Anthropic responses, including streamed terminal usage.
- Kept streaming usage requests hosted-only so BYOK OpenAI-compatible providers do not receive a new compatibility-sensitive option; corrected the annual pricing badge to 29% off.
- Added focused pricing, migration, metering, and provider regression tests.

## Working state

- Files currently dirty or expected to change: pricing config/tests, AI usage/provider accounting/tests, three settings/chat surfaces, schema plus one additive migration, env docs, UI-contract guard, changelog, this handoff.
- Foreign changes that must remain untouched: none in this worktree.

## Verification

- Passed on the final diff: local migration deploy/status against `127.0.0.1:5432/needt_pricing_ai_limits`; `npm run prisma:generate`; `npm run type-check`; `npm run lint`; full unit suite (171 passed, 1 skipped; 813 tests passed, 1 skipped); `npm run build` plus production artifact check (1393 files); `npm run check:ui-contracts`; `npm run check:branding`; `npm run check:agent-handoffs`; `git diff --check`.

## Decisions and constraints

- No AI usage number may appear in app, email or landing copy; APIs may retain internal counters.
- Owner permanently authorized feature-branch pushes and draft PRs for all GOAL phases; pushing `main`/`landing`, merging PRs, deploys, and Neon remain forbidden.
- Both database variables must be explicitly set to the loopback Compose database before every connecting Prisma command. Never use `.env`/Neon.
- This branch implements only the first Phase 3.1 PR; later soft-limit and buyer-cap PRs remain separate.

## Blockers

- None. The temporary APFS free-space pressure cleared without deleting either `.next` directory; the rebuild then passed.

## Next action

- Owner reviews and merges the draft PR after setting the matching Creem prices and `NEEDT_AI_LIFETIME_ACTION_CAP=300` in production; this agent does not merge, deploy, or change production configuration.
