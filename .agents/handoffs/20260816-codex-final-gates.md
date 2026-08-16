---
id: 20260816-codex-final-gates
owner: codex
branch: codex/design-completion
status: active
updated: 2026-08-16T03:59:52Z
objective: Complete the remaining T9 documentation/accessibility work and prove the T10 then S12 final gates.
---

## Scope

- Governing plan/spec: `docs/plans/07-sol-high.md` S9, S10, S12 and `docs/plans/08-terra-high.md` T7, T9, T10.
- In scope: final-gate verification, necessary functional accessibility fixes, documentation reconciliation, and this handoff.
- Out of scope: Figma redesign/capture machinery, provider credentials, product expansion, and foreign dirty files.

## Completed

- Confirmed the S9/S10 implementation commit `36663a5` is an ancestor of this branch: CalDAV update modes, list-aware task collisions, local scheduling-field preservation, pending Outlook persistence, supported task-sync route, scheduler buffer invariants, workspace-safe AI actions, confirmations, and entity links are present.
- Fixed MotionRuntime hydration reversion of `data-needt-motion` without changing the owner-maintained Figma capture script; full `WATCHPACK_POLLING=true npm run test:style` passed (15 tests).
- Added the owner-required AI record boundary: `AiConversation`, `AiMessage`, and `AgentMemory` now backfill to personal workspaces, require `workspaceId`, and are filtered and created through authenticated workspace scope.

## Working state

- Files currently dirty or expected to change: `src/app/api/customization/route.ts`, its unit test, and this handoff before the T10 gate.
- Foreign changes that must remain untouched: `.codex/config.toml`, `AGENTS.md`, `CLAUDE.md`, `docs/plans/README.md`, `src/app/layout.tsx`, `.playwright-mcp/`, `NEXT_AGENT.md`, and `pages-mobile-slash-390.png`.

## Verification

- Passed: focused MotionRuntime Playwright regression (desktop/tablet/mobile); full style suite (15 passed); Prisma validation; AI workspace-scope Jest coverage (6 tests); type-check and lint; T9 branding/UI contracts/handoff checks.
- Not run / still required: production visual rerun after the Settings repair; T10 remaining complete gates; S12 critique and remaining Sol gates.

## Decisions and constraints

- Preserve `src/app/layout.tsx` Figma capture script as directed by the owner. MotionRuntime owns the dynamic motion data attribute and observes only that attribute after hydration.
- Final browser commands use `WATCHPACK_POLLING=true` and an elevated local process because native Watchpack/Chromium cannot run reliably inside the nested macOS sandbox.
- The full visual suite's dev server aborts requests under this filesystem. The targeted production-server visual rerun is stable; run it after a fresh `npm run build` using `NEEDT_VISUAL_PRODUCTION_SERVER=1`.

## Blockers

- None.

## Next action

- Commit the customization null-token repair, rebuild, and use production-server visual tests before continuing T10.
