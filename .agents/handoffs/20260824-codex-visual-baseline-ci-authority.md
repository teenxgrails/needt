---
id: 20260824-codex-visual-baseline-ci-authority
owner: codex
branch: codex/visual-baseline-ci-authority
status: active
updated: 2026-08-24T00:57:17Z
objective: Make Linux visual baselines CI-authoritative, refresh the clean-main Linux set, and keep visual drift non-blocking until the authority path is verified.
---

## Scope

- Governing plan/spec: `docs/plans/09-launch.md`; owner brief dated 2026-08-24.
- In scope: CI visual dispatch/authority path, Linux snapshot baseline refresh, temporary non-blocking visual enforcement, tests and this handoff.
- Out of scope: merge, production deploy, application UI changes, non-Linux snapshots, and the existing PR #20 release changes.

## Completed

- Created an isolated worktree and fast-forwarded it to fresh `origin/main` at `e93d61a` (PR #20 merged).
- Added a guarded baseline updater that accepts only `CI === "true"` on Linux, with unit coverage for accepted and rejected environments.
- Added a manual Ubuntu CI job that generates snapshots, rejects every non-Linux-PNG working-tree change, switches to `origin/main`, and pushes a separate baseline-only branch.
- Made the existing visual enforcement step report a warning without failing; the workflow comment records the condition for restoring `exit 1`.
- Committed the infrastructure as `477427d` and opened PR #21 with no PNG files.
- Ran workflow dispatch `32677725762` successfully on Ubuntu; it created commit `c2a6faa` on `codex/linux-visual-baselines-20260824` from `e93d61a`.
- Reviewed all 41 generated old/new pairs and opened PNG-only PR #22: 26 desktop, 8 tablet, and 7 mobile baselines across 7 visual spec groups.

## Working state

- Files currently dirty: this handoff only (durable final checkpoint after the infrastructure commit).
- Baseline branch state: 41 modified Linux PNGs only; no additions, deletions, source files, workflows, or macOS snapshots.
- Foreign changes that must remain untouched: the primary checkout, PR #20 (`codex/ci-release-recovery`), and every other registered worktree.

## Verification

- Passed: initial `npm run agent:context`; clean worktree check; Prettier check on all changed code/workflow files; updater refusal on macOS outside CI; `npm run type-check`; `npm run lint`; full `npm run test:unit -- --runInBand` (164 suites / 772 tests passed, one suite/test skipped).
- Passed: `npm run check:agent-handoffs`; dispatch run `32677725762`; exact PR #22 path/count audit; all 41 PNG dimensions unchanged; manual old/new review found no blank, broken, loading, or error captures.
- Not run / still required: PR #22 CI is running as `32678226964`; confirm `visual-style` outcome before closing this handoff.

## Decisions and constraints

- Linux baselines are accepted only from an Ubuntu CI artifact; macOS must not write `-linux` paths.
- Visual-style remains informative and uploads artifacts, but does not block CI until the CI-authoritative baseline path is verified.
- The dispatch executes from this infrastructure branch but switches to clean `origin/main` before committing, so its target PR contains Linux PNGs only.
- Review note: current Linux mobile captures expose existing fixed-bottom-nav overlap on Account and Focus; PR #22 records current `main` without expanding scope into UI changes.

## Blockers

- None.

## Next action

- Wait for PR #22 CI run `32678226964`; if `visual-style` is green, mark this handoff complete and leave PRs #21/#22 unmerged.
