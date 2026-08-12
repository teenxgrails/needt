---
id: 20260812-codex-release-speed
owner: codex
branch: codex/release-speed
status: active
updated: 2026-08-12T02:11:00Z
objective: Restore fast production releases by decoupling web deployment from image publishing and removing unused arm64 emulation
---

## Scope

- Governing plan/spec: `docs/STACK.md` production release sequence.
- In scope: `.github/workflows/docker-publish.yml` and its workflow contract test.
- Out of scope: application runtime behavior and Coolify resource topology.

## Completed

- Confirmed the production host reports `x86_64`; the published image is consumed only by that amd64 Coolify host.
- Changed the workflow so web deploys after gates while the production image publishes in parallel.
- Kept worker and collaboration deployment blocked on both the healthy exact-SHA web and the published image.
- Removed unused QEMU setup and arm64 publishing.

## Working state

- Files currently dirty or expected to change: `.github/workflows/docker-publish.yml`, `src/__tests__/production-deploy-workflow.test.ts`, and this handoff.
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
