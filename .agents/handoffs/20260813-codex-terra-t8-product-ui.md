---
id: 20260813-codex-terra-t8-product-ui
owner: codex
branch: codex/terra-t8-product-ui
status: blocked
updated: 2026-08-13T22:42:18Z
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
- Committed T8.4b as `e0a1dc2` (`feat(focus): add flexible habits`).
- Audited T8.5: Mail already provides Snooze and Remind Me; no focused-splits server contract, endpoint, or persistence model exists.
- Audited T9: `docs/security-model.md`, `docs/STACK.md`, and `docs/release-gate.md` already cover the required access/threat models and collaboration release gate.

## Working state

- Files currently dirty or expected to change: `src/components/projects/ProjectHealthPanel.tsx`, `src/components/focus/HabitPanel.tsx`, `src/components/mail/MailPage.tsx`, this handoff.
- Foreign changes that must remain untouched: `.codex/config.toml`, `CLAUDE.md`, `docs/plans/README.md`, `src/app/layout.tsx`, `.playwright-mcp/`, `NEXT_AGENT.md`, `docs/plans/08-terra-high.md`, `pages-mobile-slash-390.png`.

## Verification

- Passed: T8.1 checks; T8.2 `npm run type-check`, targeted ESLint, and `npm run test:unit -- --runInBand src/lib/__tests__/saved-views.test.ts`.
- Attempted: Playwright `/tasks` before and after the edit; the pre-existing local server returns HTTP 500, so no authenticated visual assertion was possible.
- Not run / still required: targeted checks per Terra release; full release gates after T8. Docker/E2E remain blocked by the existing Docker Desktop, disk-space, and user-owned dev-server conditions recorded by Sol.

## Decisions and constraints

- Deliver one independent T8 release at a time: capacity/what-if, Saved Views, project health, habits/focus, then Mail.
- Preserve Needt tokens, shared components, and existing motion/accessibility conventions; no new dependencies or design-system rewrite.
- T8.1 must surface real capacity data, scheduler explanations, unscheduled tasks, and stale-preview recovery without exposing private calendar details.
- A focused Mail split needs an approved persistence/query contract before its UI may exist; do not infer per-user or cross-workspace storage semantics.

## Blockers

- T8.5 is blocked: implement a reviewed Sol-side data/API contract for user-defined focused Mail splits, then wire it into `MailPage`.
- Full runtime gates are independently blocked; see the Sol handoff for exact owner actions.

## Next action

- After an approved focused-splits contract lands, implement its Mail UI; then run the shared final release gates when Docker/local runtime prerequisites are restored.
