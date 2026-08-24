---
id: 20260824-codex-visual-baseline-ci-authority
owner: codex
branch: codex/visual-baseline-ci-authority
status: active
updated: 2026-08-24T00:44:48Z
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

## Working state

- Files currently dirty: `.github/workflows/ci.yml`, `package.json`, `scripts/update-visual-baselines.ts`, `scripts/visual-baseline-update-guard.ts`, `src/__tests__/visual-baseline-update-guard.test.ts`, `src/__tests__/visual-baseline-workflow.test.ts`, and this handoff.
- Files expected from the dispatch only: Linux PNGs under `tests/visual/*-snapshots/` on a separate branch created from `origin/main`.
- Foreign changes that must remain untouched: the primary checkout, PR #20 (`codex/ci-release-recovery`), and every other registered worktree.

## Verification

- Passed: initial `npm run agent:context`; clean worktree check; Prettier check on all changed code/workflow files; updater refusal on macOS outside CI; `npm run type-check`; `npm run lint`; full `npm run test:unit -- --runInBand` (164 suites / 772 tests passed, one suite/test skipped).
- Not run / still required: handoff validation, CI workflow, a CI-produced full Linux baseline set, and review of every generated PNG diff.

## Decisions and constraints

- Linux baselines are accepted only from an Ubuntu CI artifact; macOS must not write `-linux` paths.
- Visual-style remains informative and uploads artifacts, but does not block CI until the CI-authoritative baseline path is verified.
- The dispatch executes from this infrastructure branch but switches to clean `origin/main` before committing, so its target PR contains Linux PNGs only.

## Blockers

- None.

## Next action

- Validate and commit the infrastructure change, push it, open its PR, then dispatch `.github/workflows/ci.yml` on that ref with a fresh baseline target branch.
