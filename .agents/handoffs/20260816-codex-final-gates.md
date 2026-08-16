---
id: 20260816-codex-final-gates
owner: codex
branch: codex/design-completion
status: active
updated: 2026-08-16T03:47:36Z
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

- Files currently dirty or expected to change: `docs/plans/08-terra-high.md` and this handoff before the T10 gate.
- Foreign changes that must remain untouched: `.codex/config.toml`, `AGENTS.md`, `CLAUDE.md`, `docs/plans/README.md`, `src/app/layout.tsx`, `.playwright-mcp/`, `NEXT_AGENT.md`, and `pages-mobile-slash-390.png`.

## Verification

- Passed: focused MotionRuntime Playwright regression (desktop/tablet/mobile); full style suite (15 passed); Prisma validation; AI workspace-scope Jest coverage (6 tests); type-check and lint.
- Not run / still required: T9 static checks; T10 complete gates; S12 critique and remaining Sol gates.

## Decisions and constraints

- Preserve `src/app/layout.tsx` Figma capture script as directed by the owner. MotionRuntime owns the dynamic motion data attribute and observes only that attribute after hydration.
- Final browser commands use `WATCHPACK_POLLING=true` and an elevated local process because native Watchpack/Chromium cannot run reliably inside the nested macOS sandbox.

## Blockers

- None.

## Next action

- Commit the T9 documentation/audit status, then begin the T10 gate.
