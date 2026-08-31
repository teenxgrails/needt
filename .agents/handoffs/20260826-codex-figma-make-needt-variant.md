---
id: 20260826-codex-figma-make-needt-variant
owner: codex
branch: codex/design-completion
status: active
updated: 2026-08-26T20:05:00Z
objective: Adapt the existing Figma-Make UI source into a professional Needt variant before wiring it to production Today and Calendar data.
---

## Scope

- In scope: the user-owned `New ui /` Figma-Make source, its task-card variants, semantic project/status colors, pinned tasks, and visual interaction preview.
- Out of scope: changing production Today/Calendar data contracts, auth, or the shared `AppNav` until the visual variant is approved.

## Working state

- Files owned for this unit: `New ui /src/App.tsx`, `New ui /src/components/Sidebar.tsx`, `New ui /src/components/Header.tsx`, `New ui /src/components/Board.tsx`, `New ui /src/components/Icon.tsx`, `New ui /src/components/primitives.tsx`, and `New ui /src/index.css`.
- Protected foreign changes: every other dirty path in the primary worktree, including existing Needt design-system files and the blocked Today identity handoff.

## Decisions

- Today and Calendar remain separate screens; the approved prototype's merged canvas is not used.
- The Figma-Make board is the visual source. Needt semantics are added through explicit status/project maps, not random colors.
- Two task-card treatments are switched globally for side-by-side review; pinned tasks are a first-class state.

## Verification

- Completed: read-only Figma context for `New thema` (`24:2`), Sidebar (`24:6`), Header (`24:157`), and TaskCard (`24:227`); read-only audit of Needt prototype rules and design-system tokens.
- Pending: source build/typecheck and visual inspection after the variant edits.

## Next action

- Implement the Needt variant in the owned Figma-Make files, then run the narrowest available local checks and stop at a review checkpoint.
