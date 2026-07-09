# QA Report — Mina Design Parts 1-6

Date: 2026-07-08

## Build, Type, Test

- PASS: `pnpm prisma validate` with `DATABASE_URL` and `DIRECT_URL` set to local Postgres URL.
- BLOCKED: `pnpm prisma migrate deploy` against fresh local DB. The environment has no reachable Postgres on `localhost:5432`, and `docker` is not available in this shell.
- PASS: `pnpm tsc --noEmit`.
- PASS: full Jest suite via `pnpm jest --runInBand`: 39 suites passed, 1 skipped; 276 tests passed, 1 skipped.
- PASS: `pnpm build`. Build completed. Observed expected warnings while Postgres was unavailable during static collection, plus the pre-existing standalone trace warning for `/api/task-sync/sync`.

## Runtime Smoke

- PASS: dev server booted at `http://localhost:3000` and LAN `http://192.168.178.23:3000`.
- PASS: `GET /manifest.webmanifest` returned 200 on localhost and LAN address.
- PASS: `GET /setup`, `GET /auth/signin`, and `GET /style` returned 200 on localhost.
- PASS: manifest parses as JSON and includes Mina icon plus dark splash/theme colors.
- BLOCKED: fresh DB setup account creation, task creation, auto-schedule persistence, focus session persistence, calibration rendering, connector task creation, offline queued sync. These require a running Postgres database; Docker is not installed/exposed and local port 5432 is unreachable from this environment.
- NOT AVAILABLE: browser console/runtime visual QA. Playwright is not installed in this workspace, so I could not capture browser console output or screenshots from an actual rendered tab. HTTP smoke showed no PWA `navigator.serviceWorker` crash; server logs only showed database-unreachable errors.

## Fixes Made During QA

- Added direct `gaxios` dependency because app code imports it directly and pnpm strict module layout does not expose transitive packages.
- Added direct dev `yaml` dependency because the Docker quickstart test imports it directly.
- Regenerated Prisma Client after the pnpm dependency restore so new schema models/enums are reflected in TypeScript.

## Notes

- `pnpm install --no-frozen-lockfile --ignore-scripts` was used to restore `node_modules` after `pnpm prisma validate` attempted an install and removed the old shims. Lifecycle scripts were disabled because Homebrew Node 26 cannot compile `better-sqlite3@11.10.0`; the QA toolchain itself ran cleanly under the bundled Node runtime.
- A full end-to-end pass should be rerun on a machine/session with Docker or local Postgres available: `docker compose up -d db`, `pnpm prisma migrate deploy`, then the runtime checklist.

## AGENTS_NEXT

Date: 2026-07-08

### Build, Type, Test

- PASS: Phase 0 design gate. `v0.2.0` tag exists, `QA_REPORT.md` exists, and `/style` route exists.
- PASS: `pnpm install` completed cleanly with pnpm v11.7.0.
- PASS: `pnpm-lock.yaml` contains `@neondatabase/serverless` and `@prisma/adapter-neon`.
- PASS: `pnpm prisma validate` with local `DATABASE_URL` and `DIRECT_URL`.
- BLOCKED: `pnpm prisma migrate deploy` on fresh local DB. No Docker binary is available and no local Postgres is listening on `localhost:5432`.
- PASS: `pnpm tsc --noEmit`.
- PASS: full Jest suite via `pnpm jest --runInBand`: 39 suites passed, 1 skipped; 276 tests passed, 1 skipped.
- PASS: `pnpm build`. Build completed with expected DB-unreachable warnings during static collection and the existing standalone trace warning for `/api/task-sync/sync`.

### Runtime

- BLOCKED: Local `/setup` account creation and chunked-task live smoke. These require a running local Postgres; `pnpm db:up` fails because `docker` is not installed/exposed.
- BLOCKED: Neon migration and Vercel production smoke. This workspace has no `neon` or `vercel` CLI/config and no production credentials.
- PASS: MCP server protocol smoke. `mcp/mina-mcp-server.mjs` responded to `initialize` and `tools/list`, including `mina_create_task` and `mina_reschedule`.
- BLOCKED: MCP live `mina_create_task` against Mina. It requires a running Mina app, a database-backed connector token, and reachable Postgres.

### Housekeeping

- PASS: `DECISIONS.md` updated for Phase A-D choices and blockers.
- PASS: `docs/deploy.md` updated for the actual pnpm + Neon adapter flow.
- PASS: `TODO.md` has the requested “После v0.3.0” section.
- PASS: Human untracked files (`AGENTS*.md`, `.agents/`, design refs) were left uncommitted and unmodified.
- NOT TAGGED: `v0.3.0` was not created because Phase F is not fully green.

## Automation Continuation

Date: 2026-07-08

- FIXED: Auto-schedule no longer blanks the task list when the current account has no eligible auto-scheduled tasks. The schedule service now returns all current user tasks after scheduling, and the client refetches the canonical filtered task list after a successful schedule run.
- PASS: `pnpm exec tsc --noEmit`.
- PASS: `pnpm exec jest src/services/scheduling/__tests__/engine.test.ts --runInBand`: 1 suite passed, 7 tests passed.
- PASS: `pnpm build`. Build completed with the same known unavailable-Postgres warnings for `localhost:5432` during static collection and the existing standalone trace warning for `/api/task-sync/sync`.

## UI Base Pass

Date: 2026-07-08

- PASS: Calendar, task modal, and settings were converted to the updated flat Motion-style base. The target pass files no longer use Liquid Glass/glow classes; shared glass utilities remain in the repo for later design work.
- PASS: `pnpm tsc --noEmit`.
- PASS: full Jest suite via `pnpm jest --runInBand`: 39 suites passed, 1 skipped; 276 tests passed, 1 skipped.
- PASS: `pnpm build`. Build completed with known DB-unreachable warnings for the configured Neon host during static collection and the existing standalone trace warning for `/api/task-sync/sync`.
- PASS: Local dev server started. Port `3000` was occupied by another process returning HTTP 500, so Next served this build on `http://localhost:3001`.
- PASS: Browser smoke for `http://localhost:3001/auth/signin`; desktop width had no horizontal overflow, and 390px mobile width had no horizontal overflow.
- BLOCKED: Live creation of a task through the modal and through calendar-slot click. `/calendar` and `/setup` redirected to sign-in, no authenticated local session was available, and the configured database host was unreachable, so task persistence could not be exercised from the browser.

## Polish Pass

Date: 2026-07-09

- PASS: Removed the leftover ambient wash from the app canvas. Browser computed `body` background on localhost is `rgb(26, 29, 30)`, and `background-image` does not contain a radial gradient.
- PASS: Calendar grid and side panels were tightened to Motion-style density; week slots are compact, labels are smaller, and event chips use flat `#262627` surfaces with `#323234` borders.
- PASS: Added Framer Motion animations for calendar view/date transitions, event chip layout/hover, quick-create popover, task modal spring, calendar feed list stagger, and settings shell transitions. Animated surfaces use `useReducedMotion` so reduced-motion users get zero-duration/no-motion variants.
- PASS: `pnpm tsc --noEmit`.
- PASS: full Jest suite via `pnpm jest --runInBand`: 39 suites passed, 1 skipped; 276 tests passed, 1 skipped.
- PASS: `pnpm build`. Build completed with known DB-unreachable warnings for the configured Neon host during static collection.
- PASS: Local dev server started at `http://localhost:3000`.
- PASS: Browser smoke for `http://localhost:3000/auth/signin`; desktop and 390px mobile widths had no horizontal overflow.
- BLOCKED: Authenticated calendar animation and task-modal creation smoke. `/calendar` redirected to sign-in, and no authenticated local session/database-backed account was available in this environment.

## Master Pass

Date: 2026-07-09

- PASS: Phase 1-10 commits created:
  `feat(m-1)`, `fix(m-2)`, `feat(m-3)`, `feat(m-4)`, `feat(m-5)`, `feat(m-6)`, `feat(m-7)`, `feat(m-8)`, `feat(m-9)`, `feat(m-10)`.
- PASS: `pnpm prisma validate`.
- BLOCKED: `pnpm prisma migrate deploy` against the configured Neon database failed in the sandbox; escalated retry was rejected because it would mutate an external database without explicit target approval.
- PASS: `pnpm tsc --noEmit`.
- PASS: full Jest via `pnpm test:unit`: 39 suites passed, 1 skipped; 276 tests passed, 1 skipped.
- PASS: `pnpm build`. Build completed with known DB-unreachable warnings during static collection.
- PASS: Local dev server started at `http://localhost:3000`.
- PASS: Live browser smoke for `/calendar` and `/chat` reached the app shell, then redirected to `/auth/signin` as expected without an authenticated session.
- PASS: No top nav/footer visible on the reachable shell; left Motion sidebar is the only navigation surface.
- PASS: AI Chat entry is elevated at the top of the sidebar and `/chat` exists.
- PASS: 390px mobile smoke on the reachable sign-in shell: sidebar collapsed to `64px`, document width matched viewport width, and no horizontal overflow was detected.
- PASS: PWA manifest is present and uses Mina dark canvas theme colors; service worker includes offline queueing and push notification handlers.
- BLOCKED: Authenticated live checks for calendar slot event creation, task modal creation, task colors after creation, Settings AI key save, Projects CRUD, Timeline with persisted projects, AI chat blocked/streaming states, AI tool execution, web push permission prompt, and actual offline sync. The browser has no signed-in session and the configured database is unreachable from this environment.
- NOT FULLY IMPLEMENTED: Real provider token streaming/function-calling is not wired to external LLM streaming APIs yet. The Phase 6 route gates on configured provider keys, streams server-generated responses, persists history, confirms destructive actions, and maps supported prompts to existing app-control tools.
