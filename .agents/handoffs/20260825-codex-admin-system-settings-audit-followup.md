---
id: 20260825-codex-admin-system-settings-audit-followup
owner: codex
branch: codex/admin-system-settings-route
status: complete
updated: 2026-08-25T21:17:00Z
objective: Correct the audit findings on /admin/system so it is SSR-safe, protected at every existing admin boundary, behaviorally tested, and covered by a robust orphan-component UI contract.
---

## Scope

- Governing plan/spec: audit objective at `/Users/lol/.codex/attachments/bbbc8efb-0e7b-47b0-bb76-761ff63e738d/goal-objective.md`; P0.1 in `docs/plans/12-remaining-work.md`.
- In scope: `SystemSettings`, `/admin/system`, middleware/admin authorization, its unit tests, UI-contract parser/tests, runtime SSR proof, and required gates.
- Out of scope: Prisma/API credential contract/calendar API changes, production credentials, deployment, baseline changes, and unrelated admin redesign.

## Completed

- One scoped commit created: `fix(admin): harden system settings route` (see this branch's current HEAD).
- Recovered the original completed P0.1 handoff and the independent audit objective; clean isolated worktree confirmed before edits.
- Made `SystemSettings` SSR-safe by deriving the browser origin in an effect; added a server-render unit regression.
- Restored `/admin/system` middleware redirection for non-admin JWTs and made the server page guard re-read `role` and `isActive` from Prisma.
- Replaced page source-text assertions with rendered active-admin, non-admin, and inactive-admin cases; updated focused E2E to assert the middleware redirect.
- Replaced UI-contract substring matching with TypeScript-AST reachability checks for `AdminOnly` and `useAdmin`, including aliases, actual JSX use, relative imports, and directory indexes. The harness runs comment, hook, relative-import, and deleted-route fixtures.
- Kept the existing UserManagement and LogViewer mounts on `/admin/system`; the restored middleware contains all three admin-only components and avoids unrelated route churn.
- Updated the Changelog and the existing OAuth-instruction unit contract to reflect client-origin state rather than render-time `window` access.

## Working state

- Files currently dirty: this handoff; Jest transform config; UI-contract checker and fixtures; SystemSettings; isAdmin; middleware; admin unit/E2E tests; OAuth setup docs unit test.
- Foreign changes that must remain untouched: every file in `/Users/lol/Needt`, all other registered worktrees, and unrelated active handoffs.

## Verification

- Passed: `npm run type-check`; `npm run lint`; `npm run test:unit` (166 suites passed, 1 skipped; 779 tests passed, 1 skipped); `npm run check:ui-contracts`; `npm run build`; `npm run test:e2e` (27 passed, 3 skipped); `npm run check:agent-handoffs` (26 validated); focused `npx playwright test tests/admin-system.spec.ts` (2 passed).
- Runtime: authenticated manual browser probes saw the credential form under `next dev` and `next start`. Dev terminal compiled `/admin/system` and returned `GET /admin/system 200` without `window is not defined`; start probe was likewise clean.
- Mutation proofs: replacing the page guard with `true` failed the non-admin and inactive-admin rendering tests; reintroducing the middleware exemption failed the redirect test; reintroducing render-time `window.location.origin` failed the SSR test; moving the actual route made UI contracts report all three orphaned settings components. Every mutation was restored before gates.
- Not run / still required: CI after the scoped commit.

## Shared test database

- Claimed 2026-08-25: local isolated E2E fixture `needt_test` at `127.0.0.1:5433` for runtime and E2E validation.
- Released 2026-08-25T21:07:32Z: no process or reservation from this workstream remains; fixture is available to the next owner.
- Claimed 2026-08-25T21:16:00Z: local isolated E2E fixture `needt_test` at `127.0.0.1:5433` for one serialized final rerun. No concurrent test process may use it.
- Released 2026-08-25T21:17:00Z: serialized final E2E completed; no process or reservation from this workstream remains.

## Decisions and constraints

- Preserve the existing three-layer admin model: middleware redirect, database-backed page authorization, and client `AdminOnly`/`AccessDeniedMessage`.
- Keep UserManagement and LogViewer on `/admin/system`; restoring the existing middleware boundary contains their exposure and avoids unrelated route churn.
- Do not use the issue-to-PR skill: this is an owner-provided audit objective on an existing branch/PR, not a GitHub issue workflow.

## Blockers

- None. A serialized rerun of the full E2E gate passed; the earlier Moodboard/Page failures were fixture-state flakes, not this diff.

## Next action

- Run CI on this branch's current HEAD.
