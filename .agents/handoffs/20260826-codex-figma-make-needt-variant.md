---
id: 20260826-codex-figma-make-needt-variant
owner: codex
branch: codex/design-completion
status: complete
updated: 2026-09-15T23:19:29Z
objective: Adapt the existing Figma-Make UI source into a professional Needt variant before wiring it to production Today and Calendar data.
---

Superseded on 2026-09-11 by the Claude Design port (`docs/handoff/PORT.md`). No
code from this workstream shipped. Closed on 2026-09-15.

## Scope

- In scope: the user-owned `New ui /` Figma-Make source, its task-card variants, semantic project/status colors, pinned tasks, and visual interaction preview.
- Out of scope: changing production Today/Calendar data contracts, auth, or the shared `AppNav` until the visual variant is approved.

## Completed

- Read-only Figma context for `New thema` (`24:2`), Sidebar (`24:6`), Header (`24:157`) and TaskCard (`24:227`), and a read-only audit of the then-current Needt prototype rules and design-system tokens.
- No implementation. The variant was never edited.

## Working state

- Files currently dirty or expected to change: none. The `New ui /` source now lives in `_archive-figma-make/New ui /`.
- Foreign changes that must remain untouched: none from this workstream.

## Verification

- Passed: the read-only audits above.
- Not run: build, type-check and visual review of the variant. The work was cancelled before any edit.

## Decisions and constraints

- Historical, no longer binding: Today and Calendar remain separate screens; the Figma-Make board is the visual source; two task-card treatments switch globally for review.
- The design source is `docs/handoff/PORT.md` and the vendored `.needt-v2` CSS. Figma and Figma Make are not design sources.

## Blockers

- None.

## Next action

- None. Closed. Design work continues from `docs/handoff/CODEX-NEXT.md`.
