---
id: 20260813-codex-terra-t8-product-ui
owner: codex
branch: codex/terra-t8-product-ui
status: active
updated: 2026-08-13T22:20:49Z
objective: Deliver the Terra T8 product UI for the completed Sol S11 backend contracts as independent, scoped releases.
---

## Scope

- Governing plan/spec: `docs/plans/08-terra-high.md` T8, after Sol S11.
- In scope: Tasks capacity/what-if, Saved Views, project health, habits/focus targets, remaining Mail focused splits, and directly related accessibility/docs.
- Out of scope: Sol S11 runtime-gate recovery, deploy/push, migrations, and unrelated dirty files.

## Completed

- Audited T8 backend/UI gap: Sol APIs exist; Tasks only renders a basic reflow preview, while the other T8 surfaces have no discovered product UI yet.
- Created isolated branch `codex/terra-t8-product-ui` from `0d2cd54`.
- T8.1 implementation complete: Tasks renders seven-day capacity, schedule explanations, unscheduled tasks, typed notifications, and stale-preview recovery.

## Working state

- Files currently dirty or expected to change: `src/app/(app)/tasks/page.tsx`, `CHANGELOG.md`, this handoff; later T8 release files are added only after their targeted audit.
- Foreign changes that must remain untouched: `.codex/config.toml`, `CLAUDE.md`, `docs/plans/README.md`, `src/app/layout.tsx`, `.playwright-mcp/`, `NEXT_AGENT.md`, `docs/plans/08-terra-high.md`, `pages-mobile-slash-390.png`.

## Verification

- Passed: `npx prettier --check src/app/(app)/tasks/page.tsx`; `npm run type-check`; targeted ESLint; `npm run check:agent-handoffs`; diff check.
- Attempted: Playwright `/tasks` before and after the edit; the pre-existing local server returns HTTP 500, so no authenticated visual assertion was possible.
- Not run / still required: targeted checks per Terra release; full release gates after T8. Docker/E2E remain blocked by the existing Docker Desktop, disk-space, and user-owned dev-server conditions recorded by Sol.

## Decisions and constraints

- Deliver one independent T8 release at a time: capacity/what-if, Saved Views, project health, habits/focus, then Mail.
- Preserve Needt tokens, shared components, and existing motion/accessibility conventions; no new dependencies or design-system rewrite.
- T8.1 must surface real capacity data, scheduler explanations, unscheduled tasks, and stale-preview recovery without exposing private calendar details.

## Blockers

- Full runtime gates are blocked independently of this workstream; see the Sol handoff for exact owner actions.

## Next action

- Commit T8.1, then audit the existing Saved Views routes and host surface for T8.2.
