---
id: 20260916-codex-launch-goal
owner: codex
branch: codex/design-completion
status: active
updated: 2026-09-15T23:55:00Z
objective: Complete the owner-approved launch goal without production, Neon, deploy, or protected-branch mutations.
---

## Scope

- Governing plan/spec: `/Users/lol/Needt-handoff/2026-09-15-launch-goal/GOAL.md`, plus `docs/plans/00-roadmap.md` and `docs/handoff/CODEX-NEXT.md`.
- In scope: coordinate phases 1–6, keep the port branch current, open feature PRs, validate local-only migration and screens, and write the final external report.
- Out of scope: Neon, production/Coolify, deploys, Creem/DNS/secrets, pushes to `main` or `landing`, merging PRs, final legal copy, and changes to `PORT.md` §0/§6/§8.

## Completed

- Phase 1 steps 1–4 were completed through merge `ca2d034` with required gates green.
- Applied the docs refresh as `6ff1683`, reconciling its stale pre-merge facts and preserving newer evidence in the two drifted handoffs.
- Reconciled the merged UI/branding gates with the scoped port: the canonical
  `.needt-v2` accent is allowed only in port components, both native selects now
  use `NeedtPicker`, and the theme contract checks `gray|graphite → dim`.
- Pushed `codex/design-completion` through `e5a20a0` as a fast-forward; the
  standing owner permission covers later feature-branch pushes and draft PRs,
  never `main`/`landing`, merge, deploy, production, or Neon.
- Opened draft PR #34, `Design port`, from `codex/design-completion` to `main`;
  its body records the workspace authorization defect and the scoped fix.
- Phase 2 task ids are strings end to end, `hashTaskId` is gone, fixture and
  consumer contracts use strings, and generated preview ids use local strings.
- Closed the workspace-access hole in `prismaDataSource`: construction now
  requires server-resolved `WorkspaceAccess`, workspace-owned reads use its
  scope, people come from workspace membership, and out-of-scope blockers are
  removed from returned tasks.
- Started the local Compose database via `npm run db:up`, explicitly targeted
  `127.0.0.1:5432/fluid_calendar`, applied all 100 migrations through
  `20260912000000_needt_design_data_layer`, and verified two synthetic tasks
  through `prismaDataSource`; the verifier removed its synthetic rows.

## Working state

- Files currently dirty or expected to change: this handoff checkpoint only;
  Phase 3 launch blockers use separate worktrees and branches from `origin/main`.
- Foreign changes that must remain untouched: untracked design bundles, landing sources outside the three docs-package files, `docker/landing/`, `pf-sync/`, root `pnpm-lock.yaml`, and untracked dim/paper visual baselines.

## Verification

- Passed for `6ff1683`: `npm run type-check`; `npm run lint`; `npm run tokens:check`; `npm run test:unit` (194 suites passed, 1 skipped; 1282 tests passed, 1 skipped); `npm run check:agent-handoffs`; `git diff --check`; no live references to archived plan paths.
- Passed for the draft-PR boundary: `npm run type-check`; `npm run lint`;
  `npm run tokens:check`; `npm run test:unit` (194 suites passed, 1 skipped;
  1282 tests passed, 1 skipped); `npm run build`; `npm run check:ui-contracts`;
  `npm run check:branding`; `npm run check:agent-handoffs`.
- Visual: the Calendar columns picker passed as a desktop popover and a 390px
  mobile bottom sheet; all three sort options were visible and selectable.
- Phase 2 targeted: `npm run type-check`; 8 focused unit suites (148 tests);
  local `prisma migrate status` reports the schema up to date; local verifier
  returned two correctly mapped tasks with raw cuid ids, project, holder,
  dependency, parts, wait, money, stage and no-slot fields.
- Phase 2 full gates: `npm run type-check`; `npm run lint` (zero warnings);
  `npm run tokens:check`; `npm run test:unit` (195 suites passed, 1 skipped;
  1281 tests passed, 1 skipped); `npm run build` plus production-artifact check;
  `npm run check:ui-contracts`; `npm run check:branding`;
  `npm run check:agent-handoffs`; `git diff --check`.
- Not run / still required: all phase-specific and final Definition of Done gates.

## Decisions and constraints

- One writer owns this checkout. Subagents are read-only auditors unless placed in isolated worktrees.
- For every connecting Prisma command, derive the local Compose URL at runtime, override both database variables explicitly, and assert loopback host, expected port and database name without recording credentials.
- Continue PR #24 rather than duplicate it. Treat merged PR #27 as the completed billing-lifecycle workstream after current-doc revalidation.
- Before route swaps, extend the Needt data source to accept an already-authorized workspace scope; the current user-only source is not safe for shared-workspace routes.

## Blockers

- People-on-tasks remains owner-gated. Until answered, use workspace members and leave the documented `//todo` seam.
- Phase 5 source mismatch: `origin/landing` deploys static
  `design-refs/landing/index.html`, while GOAL names the React source that only
  exists on PR #32. Owner must choose the landing source before that PR.

## Next action

- Start Phase 3.1 from `origin/main` in its own worktree, re-read
  `docs/plans/13-pricing.md`, and implement the first pricing/hidden-AI-limits
  PR without touching production or the port checkout's foreign untracked files.
