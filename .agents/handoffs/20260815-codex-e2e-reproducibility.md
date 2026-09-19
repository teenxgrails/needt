---
id: 20260815-codex-e2e-reproducibility
owner: codex
branch: codex/design-completion
status: complete
updated: 2026-08-16T03:10:00Z
objective: Make the standard local E2E command reproducible against its shared disposable database and web-server fixture.
---

## Scope

- Governing plan/spec: `docs/plans/08-terra-high.md` T2 and T10.
- In scope: Playwright worker configuration, focused regression verification, and this handoff.
- Out of scope: product behavior, public route copy, migrations, provider credentials, Docker image changes, and foreign dirty files.

## Completed

- Reproduced that the default local four-worker E2E run fails only during concurrent cold route compilation, while `npm run test:e2e -- --workers=1` passes (24 passed, 3 credential-gated skips).
- Cleared stale `.next` and regenerated the current branch Prisma client; this removed stale T8 route/schema errors.
- Set the suite to one worker, added Chromium sandbox flags for the managed runtime, and made the E2E-only web server use Webpack/Watchpack polling.

## Working state

- Files currently dirty or expected to change: `playwright.config.ts` and this handoff.
- Foreign changes that must remain untouched: `.codex/config.toml`, `CLAUDE.md`, `docs/plans/README.md`, `src/app/layout.tsx`, `.playwright-mcp/`, `NEXT_AGENT.md`, `docs/plans/08-terra-high.md`, and `pages-mobile-slash-390.png`.

## Verification

- Passed: Docker daemon recovery; Prisma generate/validate; standard `npm run test:e2e` with a shell soft limit of `65536` — 24 passed, 3 credential-gated skips (3.1m).
- Not run / still required: type-check, lint and applicable remaining release gates.

## Decisions and constraints

- Keep the E2E suite at one worker because it resets one shared PostgreSQL/Redis fixture and cold-compiles a single local dev server. Do not add retries or widen assertion timeouts to hide contention.

## Blockers

- None.

## Next action

- Continue with the separately scoped T8.5 focused-splits validation and commit.
