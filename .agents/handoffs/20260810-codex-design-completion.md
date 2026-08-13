---
id: 20260810-codex-design-completion
owner: codex
branch: codex/design-completion
status: active
updated: 2026-08-13T18:40:00Z
objective: Complete the dependency-ordered design completion plan after Terra T1-T4
---

## Scope

- Governing plan/spec: `docs/plans/07-sol-high.md` and
  `docs/plans/08-terra-high.md`.
- In scope: preserve the completed Terra prerequisites, establish durable
  multi-agent handoff, then resume at S5 through the documented dependencies.
- Out of scope: unrelated product changes and user-owned dirty files.

## Completed

- S1 `328c5b0`, S2 `e25f7e6`, S3 `d454be6`, S4 `adbedf2`.
- Terra T1 `8760953`, T2 `71f7d79`, T3 `7411b53`, T4 `90d2720`.
- Project Hallmark `4a79c58`; Needt critique skill `679af84`.
- S5 blocker fixes: auth/workspace scheduling `b0dfa1c`, offline replay
  `2f32f4f`, stale T4 contract test `962d3eb`, and duplicate Yjs prevention
  `35f6a26`.
- Visual production baselines and deterministic fixtures `a34f4b9`.
- Production image/runtime hardening `f2a6959`: auth initialization is deferred
  to runtime, session-dependent pages are dynamic, and the entrypoint fails
  immediately when environment validation or migrations fail.
- PR #16 release review fix `d4a9fc9`: a pre-column compatibility trigger keeps
  the fallback writer working through the workspace dependency migration,
  Prisma schema drift is zero, and production deployment now fails closed and
  waits for the exact healthy web SHA before worker/collaboration rollout.
- PR #16 CI follow-up is in progress: hard-coded collaboration test keys were
  replaced with ephemeral keys, restored `/task` commands now retry ahead of
  the slash menu, and visual snapshots are being split by host platform.
- The Dockerfile now has a dedicated `collaboration` runtime target: it builds
  `dist/collaboration`, carries the Prisma runtime, and starts the Hocuspocus
  server through the shared entrypoint.
- Dedicated collaboration target committed and pushed as `2f605b3`.
- CI follow-up `a586279` updates the collaboration-aware Docker contract test
  and runs all root Dockerfile runtime targets as the non-root `node` user.
- Coolify release contract fix `34f4f44` replaces the nonexistent rollback
  webhook with documented authenticated GET deploy webhooks, records the prior
  healthy SHA for manual native rollback, and maps Coolify `SOURCE_COMMIT` to
  the runtime `NEEDT_BUILD_SHA` identity.
- Release checkpoint `560e621` is pushed and both CI workflows for that head
  passed. All required production secret names are present.
- The 2026-08-10 production backup was restored into the isolated
  `needt_restore_drill` database. `pg_restore --exit-on-error` passed, restored
  and live row counts matched (`User=6`, `Task=36`), 72 completed Prisma
  migrations were present, and the scratch database was removed.
- Local provider/scheduling correctness sweep `36663a5`: scoped task-sync
  collision identity, Outlook pending reconciliation, scheduler buffers,
  CalDAV mode validation, AI action links, sync-status migration, and S9/S10/T9
  documentation coverage.
- CalDAV recurring-instance completion `2e5b261`: single edits/deletes update
  the master resource with `RECURRENCE-ID`/`EXDATE`; explicit exceptions and
  local RRULE expansion retain their original occurrence identity.
- Local S6/T5 workspace lifecycle implementation is ready to commit: one
  active-workspace provider scopes same-origin API requests, clears Query and
  Zustand data on a switch, reconnects realtime with the selected workspace,
  and passes that selection to the offline service worker. The existing profile
  menu and Settings now provide functional switching and workspace management
  without a visual redesign.
- Shared-workspace lifecycle now also supports create, invite token copy,
  accept/decline, member list, Owner role changes/removal, invitation revoke,
  member leave and final-Owner protection. Declined invitations are preserved
  through additive migration `20260813150000_workspace_invite_declined_at`.
- S6/T5 checkpoint committed locally as `ba893f2` (`feat: complete workspace
  lifecycle`). The next owned scope is S7/T6 Pages metadata: workspace-scoped
  folders/tags and versioned Smart Folder query contracts, extending the
  existing Pages architecture without a UI redesign.
- Local S7/T6 Page metadata implementation committed as `288acea`: additive
  PageFolder/PageTag/PageSmartFolder models and migration
  `20260813170000_page_metadata`; strict v1 Smart Folder query parsing;
  workspace-authorized metadata and Page-organization APIs; server-side Pages
  filters; and minimal integration in the existing Pages home/editor controls.
- T7 Tasks/Projects/Space mobile recovery committed as `f7e34f0`: the desktop-first
  Space canvas now provides 44px controls that switch phone users to the
  existing functional Task List or Board instead of an inert desktop notice.
- T7 Moodboards list recovery committed as `2e31963`: the existing workspace gains
  a local title search, Recent/Other ordering, and a purposeful first-board
  empty state without changing the canvas or persistence contracts.
- T7 Settings discovery is ready to commit: desktop and mobile settings
  navigation both filter the established settings list by name; workspace and
  billing remain existing functional panels.
- T7 settings discovery committed as `114a71c`. Today and Focus already meet
  their route contracts in the existing implementation; Mail Snooze/Remind Me
  and a persisted post-account onboarding guide remain deliberately deferred
  because the plan makes them dependent on a reviewed backend contract.
- S8 Pages adversarial review found no evidence-backed P0/P1: metadata routes
  authenticate workspace membership and Page editor access before checking
  folder/tag scope, and the collaboration/publication/offline tests exercise
  the relevant security and recovery contracts.
- S9/S10 audit is complete: CalDAV recurrence identity, task-sync list-aware
  collision handling, scheduling-buffer invariants, workspace-scoped AI reads
  and confirmation-bound mutations are implemented and pass their focused
  tests. The task-sync endpoint is implemented, not a stale `501` contract.
- T7 Mail contract is ready to commit: additive `MailMessage.snoozedUntil`
  keeps Snooze local until tomorrow morning, and Remind Me creates a current
  workspace task with the existing zero-offset deadline reminder. Neither
  action invents a Gmail/Outlook/IMAP provider mutation.

## Working state

- Release contract fix `34f4f44` and checkpoint `560e621` are pushed to PR #16.
  Both duplicate CI workflows for `560e621` completed successfully.
- The S5 adversarial review is complete. Blockers found in S1/S3/T4 are
  committed: production auth now fails closed, scheduling runs and connector
  reschedules are workspace-scoped, offline replays are idempotent and
  revision-aware, and the stale companion contract test matches the shipped UI.
- The production visual suite is deterministic after resetting settings for
  every fixture, suppressing the timed companion intro, sorting loose Space
  tasks by date/ID, and aligning stale Pages/theme assertions. Reviewed
  production baselines are committed in `a34f4b9`.
- Preserve existing user changes in `docs/plans/README.md`,
  `src/app/layout.tsx`, `.codex/config.toml`, `.playwright-mcp/`,
  `NEXT_AGENT.md`, `docs/plans/08-terra-high.md`, and
  `pages-mobile-slash-390.png`.
- Preserve the protected foreign files above. No S6/T5 code remains owned
  dirty after `ba893f2`. `CLAUDE.md` has one owned stale-schema-description
  correction, but it is unrelated to the active Pages scope.
- The local production image `needt:s5-smoke` builds without build-time auth
  secrets. Against a clean PostgreSQL 16 container it applied all 85 migrations,
  started Next.js, and returned `{ok:true,db:"ok"}` from `/api/health`.
- Owned uncommitted Mail files are `prisma/schema.prisma`, additive migration
  `20260813190000_mail_message_snooze`, `src/lib/mail-db.ts`,
  `src/app/api/mail/messages/[id]/route.ts`, `src/components/mail/MailPage.tsx`
  and `src/lib/mail/__tests__/mail-snooze-contract.test.ts`.

## Verification

- Passed: `npx prisma validate`, `npm run type-check`, `npm run lint`, full
  `npm run test:unit` (125 suites, 641 tests; one suite/test skipped),
  `npm run check:branding`, `npm run check:ui-contracts`, `npm run build`,
  `npm run build:worker`, `npm run build:collaboration`, collaboration runtime
  check, and `git diff --check`.
- Build caveat: Next completed successfully but logged that static generation
  could not reach the configured remote Neon database.
- Passed after production hardening: full unit (125 suites, 641 tests; one
  suite/test skipped), full E2E with one worker (24 passed, three
  credential-gated skips), type-check, lint, targeted Docker/auth tests, the
  production Docker build, and the clean-database runtime smoke test.
- Passed after PR #16 review fixes: Prisma validate/generate, zero schema drift,
  86-migration clean-database deploy plus legacy-writer SQL smoke, type-check,
  lint, branding/UI contracts, full unit (126 suites, 644 tests), full E2E (24
  passed, three credential skips), app/worker/collaboration builds, runtime
  identity check, and production Docker build.
- Previously passed: style (15 passed) and production visual (65 passed, four
  breakpoint-gated skips). The visual suite passed again without updating
  snapshots.
- Yjs duplicate-import warning found in E2E is fixed by externalizing Yjs from
  Next server route bundles; targeted Pages E2E passes without the warning.
- Still required before S6: deploy this hardening through the authorized
  production workflow and run the production smoke/release gate.
- Targeted collaboration tests, type-check, lint, and the Today failed-create
  retry visual scenario pass after the CI follow-up changes.
- Passed after the collaboration image change: `docker build --target
collaboration --tag needt:collaboration-smoke .`, an isolated collaboration
  container smoke run with a temporary PostgreSQL dependency, and `npm run
check:collaboration-runtime`.
- Passed for `a586279`: local full unit (126 suites, 644 tests, one skipped),
  type-check, lint, and targeted Docker contract tests. Both GitHub CI workflows
  passed security, schema drift, quality gates, E2E, visual and style jobs.
- Local Docker rebuild was not rerun because Docker Desktop did not answer its
  API socket; GitHub's collaboration build/runtime and Semgrep gates passed.
- Passed for `34f4f44`: targeted release/Docker contract tests (16 tests), full
  unit (126 suites, 646 tests, one skipped), type-check, lint, branding,
  collaboration build/runtime, Prettier and diff checks.
- Both GitHub CI workflows for `560e621` passed all required jobs. The fresh
  2026-08-10 production backup restore drill also passed as recorded in
  `docs/operations-runbook.md`.
- Passed for `2e5b261`: focused CalDAV unit tests (18 tests), type-check,
  focused lint, `git diff --check`, then the commit hook's full lint and
  type-check. No provider E2E ran because credentials are intentionally absent.
- Passed for local S6/T5: Prisma validate/generate; type-check; zero-warning
  lint; branding and UI-contract checks; full unit suite (131 suites passed,
  664 tests passed, one skipped); worker and collaboration builds; collaboration
  runtime identity check; targeted workspace API/request-scope tests (9 tests);
  and diff check. Next production build compiled successfully; its final static
  page generation output was not retained by the local runner, so rerun it at
  the final commit boundary.
- Browser visual verification was attempted but no local dev server was
  running (`localhost:3000` refused the connection). Docker target build was
  attempted but Docker Desktop's daemon socket was unavailable. Neither is a
  source failure.
- Passed for local S7/T6 Page metadata: Prisma validate/generate, targeted
  Pages/service/migration unit tests (10 suites, 27 tests), type-check,
  focused lint and diff check. The Pages performance benchmark remained below
  budget (warm p95 30.0ms, keystroke p95 0.9ms).
- Passed for the T7 Space fallback: focused mobile fallback test, type-check,
  focused lint, Prettier and diff check. Browser verification remains blocked
  by the absent authenticated local app fixture.
- Passed for the T7 Moodboards list: focused contract test, type-check, focused
  lint, Prettier and diff check. Two isolated local dev servers both returned
  404 for all routes under the App route group (including unchanged `/tasks`),
  so they cannot provide route screenshots; this is an environment/router
  discovery issue, not a Moodboards response.
- Passed for T7 Settings search: focused contract test, type-check, focused
  lint, Prettier and diff check. The local route-group 404 prevents screenshots.
- Passed for S8: Pages component/service unit suite (9 suites, 26 tests),
  collaboration build and runtime identity check, type-check, zero-warning lint
  and diff check. Pages E2E/public-page E2E/visual remain a final-gate backlog
  because the local App route group cannot serve authenticated routes.
- Passed for S9/S10: scheduling/AI/task-sync focused suite (7 suites, 46
  tests), branding, UI contracts, type-check, zero-warning lint and diff check.
- Passed for T7 Mail: Prisma validate/generate, focused snooze/reminder
  contract suite (2 tests), type-check, focused lint, Prettier and diff check.

## Decisions and constraints

- Do not start S5 before Terra T1-T4; they are complete.
- The project-scoped `needt-critique` review is complete; its actionable
  blockers were returned to S1/S3/T4 and addressed without unrelated polish.
- Keep milestones in separate commits and continue by dependency order.
- Run visual regression with `NEEDT_VISUAL_PRODUCTION_SERVER=1`; the dev server
  exhausts memory during the full 69-test matrix.
- Coolify v4 has no rollback webhook API. Deploy webhooks use
  `COOLIFY_API_TOKEN`; rollback remains a guarded manual action against a
  previous locally available image.

## Blockers

- Production deployment/smoke remains intentionally deferred by the user;
  provider E2E is credential-gated. Docker target verification is additionally
  blocked until Docker Desktop is running. A local browser visual check needs a
  running dev server and an authenticated fixture.

## Next action

- Commit the owned T7 Mail paths, then evaluate final local gates and record
  the intentionally deferred persisted onboarding guide. Keep Docker,
  browser and production smoke as final-validation backlog; they require local
  Docker Desktop, an authenticated local app fixture and release authorization.
