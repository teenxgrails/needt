---
id: 20260810-codex-design-completion
owner: codex
branch: codex/design-completion
status: active
updated: 2026-08-10T01:10:00Z
objective: Complete the dependency-ordered design completion plan after Terra T1-T4
---

## Scope

- Governing plan/spec: `docs/plans/07-sol-high.md` and
  `docs/plans/08-terra-high.md`.
- In scope: preserve the completed Terra prerequisites, establish durable
  multi-agent handoff, then resume at S5 through the documented dependencies.
- Out of scope: unrelated product changes and user-owned dirty files.

## Completed

- S1 `328c5b0`, S2 `e25f7e6`, S3 `d454be6`, S4 `adbedf2`.
- Terra T1 `8760953`, T2 `71f7d79`, T3 `7411b53`, T4 `90d2720`.
- Project Hallmark `4a79c58`; Needt critique skill `679af84`.
- S5 blocker fixes: auth/workspace scheduling `b0dfa1c`, offline replay
  `2f32f4f`, and stale T4 contract test `962d3eb`.

## Working state

- The S5 adversarial review is complete. Blockers found in S1/S3/T4 are
  committed: production auth now fails closed, scheduling runs and connector
  reschedules are workspace-scoped, offline replays are idempotent and
  revision-aware, and the stale companion contract test matches the shipped UI.
- Preserve existing user changes in `docs/plans/README.md`,
  `src/app/layout.tsx`, `.playwright-mcp/`, `docs/plans/08-terra-high.md`, and
  `pages-mobile-slash-390.png`.

## Verification

- Passed: `npx prisma validate`, `npm run type-check`, `npm run lint`, full
  `npm run test:unit` (125 suites, 640 tests; one suite/test skipped),
  `npm run check:branding`, `npm run check:ui-contracts`, `npm run build`,
  `npm run build:worker`, `npm run build:collaboration`, collaboration runtime
  check, and `git diff --check`.
- Build caveat: Next completed successfully but logged that static generation
  could not reach the configured remote Neon database.
- Still required for S5 green: E2E, style, visual and production Docker gates.

## Decisions and constraints

- Do not start S5 before Terra T1-T4; they are complete.
- The project-scoped `needt-critique` review is complete; its actionable
  blockers were returned to S1/S3/T4 and addressed without unrelated polish.
- Keep milestones in separate commits and continue by dependency order.
- Do not use Docker for documentation/tooling validation; Docker Desktop was
  stopped after excessive memory/disk use.

## Blockers

- Docker Desktop remains stopped after excessive memory/disk use, so the E2E,
  style, visual and production-image gates cannot run yet.

## Next action

- Commit the reviewed S1/S3/T4 hardening units, then run the remaining Docker
  and browser gates. Do not start S6 until S5 is green and smoke-tested.
