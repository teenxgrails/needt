---
id: 20260812-codex-release-speed
owner: codex
branch: codex/release-speed
status: active
updated: 2026-08-12T02:11:00Z
objective: Restore fast and reliable production releases by decoupling web deployment, removing unused arm64 emulation, and hardening the first-push security scan
---

## Scope

- Governing plan/spec: `docs/STACK.md` production release sequence.
- In scope: production/CI workflows and their contract tests.
- Out of scope: application runtime behavior and Coolify resource topology.

## Completed

- Confirmed the production host reports `x86_64`; the published image is consumed only by that amd64 Coolify host.
- Changed the workflow so web deploys after gates while the production image publishes in parallel.
- Kept worker and collaboration deployment blocked on healthy exact-SHA web, not on image publication: current Coolify resources build directly from Git, so the GHCR image is not in their runtime path.
- Removed unused QEMU setup and arm64 publishing.
- Added an explicit all-zero baseline guard so a branch's first push runs a full Semgrep scan instead of failing before scanning.

## Working state

- Files currently dirty or expected to change: `.github/workflows/docker-publish.yml`, `.github/workflows/ci.yml`, their workflow contract tests, and this handoff.
- Foreign changes that must remain untouched: all work in the other listed worktrees and handoffs.

## Verification

- Passed: Prettier, targeted workflow test (4 tests), type-check, lint with zero warnings, handoff check, and `git diff --check`.
- Not run / still required: CI after push and manual final diff review.

## Decisions and constraints

- Production availability must not wait for the worker/collaboration image publish.
- Worker and collaboration still deploy only after both image publication and exact-SHA web health succeed.
- Reintroduce arm64 only when an actual arm64 deployment target exists.

## Blockers

- None.

## Next action

- Review the final diff, commit, push, and open a PR while the current production release finishes.
