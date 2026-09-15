---
id: 20260916-codex-launch-goal
owner: codex
branch: codex/design-completion
status: active
updated: 2026-09-15T23:24:21Z
objective: Complete the owner-approved launch goal without production, Neon, deploy, or protected-branch mutations.
---

## Scope

- Governing plan/spec: `/Users/lol/Needt-handoff/2026-09-15-launch-goal/GOAL.md`, plus `docs/plans/00-roadmap.md` and `docs/handoff/CODEX-NEXT.md`.
- In scope: coordinate phases 1–6, keep the port branch current, open feature PRs, validate local-only migration and screens, and write the final external report.
- Out of scope: Neon, production/Coolify, deploys, Creem/DNS/secrets, pushes to `main` or `landing`, merging PRs, final legal copy, and changes to `PORT.md` §0/§6/§8.

## Completed

- Phase 1 steps 1–4 were completed through merge `ca2d034` with required gates green.
- Applied the docs refresh as `6ff1683`, reconciling its stale pre-merge facts and preserving newer evidence in the two drifted handoffs.

## Working state

- Files currently dirty or expected to change: this handoff only before its checkpoint commit; phase 2 will touch the Needt task-id/data-layer seam.
- Foreign changes that must remain untouched: untracked design bundles, landing sources outside the three docs-package files, `docker/landing/`, `pf-sync/`, root `pnpm-lock.yaml`, and untracked dim/paper visual baselines.

## Verification

- Passed for `6ff1683`: `npm run type-check`; `npm run lint`; `npm run tokens:check`; `npm run test:unit` (194 suites passed, 1 skipped; 1282 tests passed, 1 skipped); `npm run check:agent-handoffs`; `git diff --check`; no live references to archived plan paths.
- Not run / still required: Phase 1 draft-PR gates; all phase-specific and final Definition of Done gates.

## Decisions and constraints

- One writer owns this checkout. Subagents are read-only auditors unless placed in isolated worktrees.
- For every connecting Prisma command, derive the local Compose URL at runtime, override both database variables explicitly, and assert loopback host, expected port and database name without recording credentials.
- Continue PR #24 rather than duplicate it. Treat merged PR #27 as the completed billing-lifecycle workstream after current-doc revalidation.
- Before route swaps, extend the Needt data source to accept an already-authorized workspace scope; the current user-only source is not safe for shared-workspace routes.

## Blockers

- Docker daemon is currently unavailable; phase 2 will start it before any migration command.
- People-on-tasks remains owner-gated. Until answered, use workspace members and leave the documented `//todo` seam.

## Next action

- Run the remaining draft-PR gates, push `codex/design-completion`, and open the draft PR against `main` without merging it.
