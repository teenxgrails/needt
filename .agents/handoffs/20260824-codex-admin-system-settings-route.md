---
id: 20260824-codex-admin-system-settings-route
owner: codex
branch: codex/admin-system-settings-route
status: complete
updated: 2026-08-24T19:04:22Z
objective: Make the system credential settings reachable only to administrators and prevent admin-only settings components from becoming orphaned again.
---

## Scope

- Governing plan/spec: `docs/plans/12-remaining-work.md` P0.1 and prompt 1 in `docs/plans/12-codex-prompts.md`.
- In scope: `/admin/system`, its existing admin navigation surface, the UI-contract invariant, focused unit coverage, browser verification, prompt gates, and a scoped PR.
- Out of scope: Prisma changes, system-settings API contract changes, credential fields, calendar API code, credentials, production operations, deployment, and merge.

## Completed

- Created an isolated worktree from `origin/codex/plan12-coordination` at `f4b2400` and confirmed the primary checkout remains untouched.
- Added the server-guarded `/admin/system` page, the existing admin menu links, and a denial branch that never renders credential controls for non-admin users.
- Mounted all three pre-existing settings components that were protected by `AdminOnly`; added their missing client-component boundaries.
- Added the generic orphaned-admin-settings UI contract, focused unit coverage, seeded admin/non-admin browser coverage, and the Unreleased changelog entry.
- Proved the contract's negative path by temporarily removing the route: the gate failed for `SystemSettings`, `UserManagement`, and `LogViewer`; the route was restored immediately and the gate passed.
- Opened PR #26 and corrected its CI portability finding by asserting the middleware redirect pathname instead of hard-coding a local origin.
- Rebased again after PR #25 advanced main. An `ENOSPC` retry recovered about 8.6 GiB by deleting only this worktree's regenerable `.next` and Playwright output; Docker Desktop was restarted after the disk-full crash.

## Working state

- Files currently dirty or expected to change: none after this completion checkpoint is committed.
- Foreign changes that must remain untouched: every file in `/Users/lol/Needt` and every other registered worktree/handoff.

## Verification

- Passed on final base `origin/main` `0483d262`: `npm run type-check`; `npm run lint`; `npm run test:unit` (165 suites, 777 tests); `npm run check:ui-contracts`; `npm run check:branding`; `npm run check:agent-handoffs`; `npm run build`; `npm run build:worker`; `npm run build:collaboration`; `npm run test:e2e` (27 passed, 3 skipped); `npm run test:style` (15 passed).
- Browser verification: seeded admin sees the Google/Outlook credential form; seeded FREE non-admin remains on `/admin/system`, sees the access-denied message, and has no form in the DOM.
- `npm run test:visual` on final main reached the real Playwright suite and reproduced Darwin-only Space baseline drift in unchanged surfaces (`space.png` and `space-light.png`, 1% pixel ratio); stopped before unrelated remaining projects. No baseline was updated.
- PR #26 (`https://github.com/teenxgrails/needt/pull/26`) implementation SHA `7c2c3455fb67f38304eb375108c4f0243199ded6` passed pull-request CI run `32764858150`: security, schema drift, quality gates, E2E, and authoritative Linux visual/style are green.

## Decisions and constraints

- Reuse the existing `/admin/operations` server and client authorization pattern and the existing shared settings/admin UI; do not add a second admin pattern or redesign the screen.
- UI work routes through the project Playwright workflow; ralphex is unnecessary for this single scoped implementation plan.
- The existing `requireAdmin` helper is request-shaped for API routes; the page uses the existing server-session `isAdmin()` helper, while `/api/system-settings` retains its unchanged `requireAdmin` boundary and each mounted settings component retains `AdminOnly`.
- Hallmark informed a restraint-only pass: reuse the established admin shell and tokens, add no new styling system, decoration, or CSS.

## Blockers

- None.

## Next action

- Reviewers may review and merge PR #26; this workstream must not merge or deploy it.
