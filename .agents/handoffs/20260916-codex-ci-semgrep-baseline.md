---
id: 20260916-codex-ci-semgrep-baseline
owner: codex
branch: codex/ci-semgrep-baseline
status: complete
updated: 2026-09-16T10:02:40Z
objective: Make Semgrep compare a pull request only with its actual main merge base.
---

## Scope

- Governing plan/spec: owner instruction in the 2026-09-16 launch-goal session.
- In scope: explicitly fetch `origin/main`, compute its merge base with `HEAD`, and pass that commit to Semgrep.
- Out of scope: Semgrep rules, ignores, existing findings, and unrelated CI jobs.

## Completed

- Replaced the event-payload fallback with an explicit `origin/main` merge base.
- Added a contract test that prevents the broken fallback from returning.

## Working state

- Files currently dirty or expected to change: the workflow, contract test, and this handoff until commit.
- Foreign changes that must remain untouched: `None` in this isolated worktree.

## Verification

- Passed: merge-base resolved to `72eeef6b45964ea90e713a8e8be5e7dee2d650b8`; targeted contract test; type-check; lint; 168 unit suites / 807 tests; UI contracts (475 files); branding (938 files); handoffs (28); build (142 pages / 1393 artifacts); `git diff --check`.
- Not run / still required: the PR's own security job is the authoritative GitHub-environment proof.

## Decisions and constraints

- Keep `fetch-depth: 0`; fetch `main` into `refs/remotes/origin/main` explicitly.
- Do not disable rules or add ignores.
- The PR itself is the authoritative test that legacy findings disappear.

## Blockers

- `None`.

## Next action

- Push the scoped commit, open a draft PR, and verify its security job ignores legacy findings.
