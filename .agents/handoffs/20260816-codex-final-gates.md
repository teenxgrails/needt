---
id: 20260816-codex-final-gates
owner: codex
branch: codex/design-completion
status: active
updated: 2026-08-16T03:37:21Z
objective: Complete the remaining T9 documentation/accessibility work and prove the T10 then S12 final gates.
---

## Scope

- Governing plan/spec: `docs/plans/07-sol-high.md` S9, S10, S12 and `docs/plans/08-terra-high.md` T7, T9, T10.
- In scope: final-gate verification, necessary functional accessibility fixes, documentation reconciliation, and this handoff.
- Out of scope: Figma redesign/capture machinery, provider credentials, product expansion, and foreign dirty files.

## Completed

- Confirmed the S9/S10 implementation commit `36663a5` is an ancestor of this branch: CalDAV update modes, list-aware task collisions, local scheduling-field preservation, pending Outlook persistence, supported task-sync route, scheduler buffer invariants, workspace-safe AI actions, confirmations, and entity links are present.
- Fixed MotionRuntime hydration reversion of `data-needt-motion` without changing the owner-maintained Figma capture script; full `WATCHPACK_POLLING=true npm run test:style` passed (15 tests).

## Working state

- Files currently dirty or expected to change: `src/components/providers/MotionRuntime.tsx` and this handoff; T9 documentation may follow after audit.
- Foreign changes that must remain untouched: `.codex/config.toml`, `AGENTS.md`, `CLAUDE.md`, `docs/plans/README.md`, `src/app/layout.tsx`, `.playwright-mcp/`, `NEXT_AGENT.md`, and `pages-mobile-slash-390.png`.

## Verification

- Passed: focused MotionRuntime Playwright regression (desktop/tablet/mobile); full style suite (15 passed).
- Not run / still required: T9 documentation/accessibility audit; T10 complete gates; S12 critique and remaining Sol gates.

## Decisions and constraints

- Preserve `src/app/layout.tsx` Figma capture script as directed by the owner. MotionRuntime owns the dynamic motion data attribute and observes only that attribute after hydration.
- Final browser commands use `WATCHPACK_POLLING=true` and an elevated local process because native Watchpack/Chromium cannot run reliably inside the nested macOS sandbox.

## Blockers

- None.

## Next action

- Audit T9 documentation/accessibility coverage against current code, then commit the scoped MotionRuntime fix and any required documentation updates before the T10 gate.
