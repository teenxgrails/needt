---
id: 20260813-codex-terra-t8-product-ui
owner: codex
branch: codex/terra-t8-product-ui
status: active
updated: 2026-08-13T22:38:27Z
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
- Committed T8.1 as `44d225f` (`feat(tasks): surface schedule capacity preview`).
- T8.2 implementation complete: Task List can save/apply personal and role-gated workspace Saved Views through the existing workspace-scoped API.
- Committed T8.2 as `51e8b76` (`feat(tasks): add workspace saved views`).
- T8.3 implementation complete: Projects now show a versioned health history and role-gated update composer with stale-update recovery.
- Committed T8.3 as `2524e26` (`feat(projects): add health update journal`).
- T8.4a implementation complete: Focus shows and updates the current member&apos;s workspace-scoped weekly target.
- Committed T8.4a as `a378305` (`feat(focus): add weekly target progress`).
- T8.4b implementation complete: Focus now hosts flexible personal habits, with create/schedule/archive controls gated by workspace role.

## Working state

- Files currently dirty or expected to change: `src/components/focus/HabitPanel.tsx`, `src/components/focus/FocusTimerPanel.tsx`, `CHANGELOG.md`, this handoff.
- Foreign changes that must remain untouched: `.codex/config.toml`, `CLAUDE.md`, `docs/plans/README.md`, `src/app/layout.tsx`, `.playwright-mcp/`, `NEXT_AGENT.md`, `docs/plans/08-terra-high.md`, `pages-mobile-slash-390.png`.

## Verification

- Passed: T8.1 checks; T8.2 `npm run type-check`, targeted ESLint, and `npm run test:unit -- --runInBand src/lib/__tests__/saved-views.test.ts`.
- Attempted: Playwright `/tasks` before and after the edit; the pre-existing local server returns HTTP 500, so no authenticated visual assertion was possible.
- Not run / still required: targeted checks per Terra release; full release gates after T8. Docker/E2E remain blocked by the existing Docker Desktop, disk-space, and user-owned dev-server conditions recorded by Sol.

## Decisions and constraints

- Deliver one independent T8 release at a time: capacity/what-if, Saved Views, project health, habits/focus, then Mail.
- Preserve Needt tokens, shared components, and existing motion/accessibility conventions; no new dependencies or design-system rewrite.
- T8.1 must surface real capacity data, scheduler explanations, unscheduled tasks, and stale-preview recovery without exposing private calendar details.

## Blockers

- Full runtime gates are blocked independently of this workstream; see the Sol handoff for exact owner actions.

## Next action

- Commit habits, then audit Mail&apos;s Snooze/Remind Me and focused split UI for T8.5.
