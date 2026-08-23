---
id: 20260822-codex-launch-l0
owner: codex
branch: codex/launch-l0
status: active
updated: 2026-08-23T00:48:03Z
objective: Execute plan 09 launch work autonomously from L0.1 without depending on the parallel design track.
---

## Scope

- Governing plan/spec: `docs/plans/09-launch.md`, beginning at L0.1.
- In scope: focused-Mail visual blocker diagnosis and closure, then dependency-ordered L0 work.
- Out of scope: production deploy/data operations, owner credentials/accounts, legal approval, design direction, and the parallel D0 implementation.

## Completed

- Started isolated branch/worktree from agreed planning commit `26f6bd5`.
- Completed L0.1: the focused Mail production-server visual spec passes on all
  three viewports and the full visual matrix is green without baseline changes.
- Fixed the production `/style` lab being statically frozen as a build-time 404
  by forcing dynamic rendering and extending the UI contract check.
- L0.1 committed as `99d4004` (`fix(launch): close focused mail visual blocker`).
- Completed L0.2 implementation: Figma capture is dev-only and opt-in through
  `NEEDT_FIGMA_CAPTURE=1`; production builds run an emitted-artifact assertion;
  local browser-agent files and root mobile screenshots are ignored.

## Working state

- Files currently dirty or expected to change for the L0.2 commit: `.gitignore`,
  `src/app/layout.tsx`, `scripts/check-production-artifacts.mjs`,
  `scripts/check-ui-contracts.mjs`, `package.json`, `CHANGELOG.md`, and this
  handoff.
- Foreign changes that must remain untouched: all dirty files in `/Users/lol/Needt`; `/private/tmp/needt-design-d0`; the design track handoff and files.

## Verification

- Passed: `npm run agent:context`; clean starting status; production build;
  `npm run check:ui-contracts`; `npm run type-check`; targeted production-server
  `secondary-surfaces` (3 passed); targeted production-server `style-lab`
  (15 passed across the matrix, one transient tablet timeout passed on focused
  rerun); full production-server visual matrix (65 passed, 4 intentional skips).
- Passed for L0.1 finalization: zero-warning lint, handoff validation,
  `git diff --check`, and scoped commit `99d4004`.
- Passed for L0.2: `npm run check:ui-contracts`; `npm run type-check`;
  zero-warning `npm run lint`; `npm run build` including the new postbuild scan
  (1,346 emitted files, no Figma capture URL); `git check-ignore` for all three
  local artifact classes; `git diff --check`.
- Not run / still required for L0.2: handoff validation and scoped commit.

## Decisions and constraints

- Plan 09 is governing and must never wait for design work.
- Inspect every visual diff manually before any baseline update.
- Keep one task per reviewed commit and preserve additive/non-destructive rules.

## Blockers

- None for L0.1/L0.2. Production deployment remains owner-only but is not
  needed for L0.3 under the governing plan.

## Next action

- Validate the handoff, commit L0.2, then begin the high-risk L0.3 integration
  audit in a dedicated integration worktree/branch.
