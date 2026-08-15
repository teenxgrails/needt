# QA Report — Mina Design Parts 1-6

## Calendar task interactions — Phase 3 (complete, 2026-07-13)

- PASS: live local Chrome check in Week view — clicking an empty grid slot opens the Motion-style quick creator with task, event, and expanded task-editor paths.
- PASS: live local Chrome check — “More task options” opens the full Task editor with description workspace, scheduling sidebar, template chooser, and Advanced settings.
- PASS: live local Chrome check — “Create event” opens the full two-column Event editor with title/time controls and a details sidebar. Empty titles disable the submit button.
- PASS: `pnpm type-check`; full `pnpm test:unit` (43 suites passed, 1 skipped; 295 tests passed, 1 skipped); `pnpm build` compiled and generated static pages, with known non-fatal unavailable-Neon warnings during static collection.
- PASS: Enter in the quick creator created a real auto-scheduled task in the selected slot; its quick view showed the generated schedule and confidence. The one test task was removed afterward and a database check confirmed zero remaining temporary tasks.
- PASS: the full editor layout was compared live against Motion and adjusted to its actual structure: wide, mostly borderless Task editor with right-side property rows; compact single-column Event editor with time controls followed by Event details.

## Calendar task interactions — Phase 1 (2026-07-13)

- PASS: Chrome live verification on the signed-in production calendar: single-clicking an auto-scheduled task opened its quick view in both Week and Day views. The popover showed the task title, status, scheduled time, and confidence.
- PASS: `pnpm tsc --noEmit`; full `pnpm test:unit` (43 suites passed, 1 skipped; 295 tests passed, 1 skipped); `pnpm build` completed with the known non-fatal unavailable-Neon warnings during static collection.
- FIXED: Calendar task click handlers now resolve canonical task ids from explicit, nested, or generated `taskId:chunkIndex` FullCalendar ids. The quick view anchors to the clicked calendar element.
- BLOCKED: The live week contained only scheduled task blocks and no ordinary timed calendar event. Timed-event quick-view verification requires permission to create and then delete one temporary event.

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

## AI Chat Provider Continuation

Date: 2026-07-09

- FIXED: `/api/ai/chat` now asks the configured provider to select supported planner tools, executes those tools server-side, and streams the final provider response back through the existing NDJSON chat protocol.
- FIXED: Anthropic uses native `tool_use` plus streaming Messages API deltas; OpenAI, Grok, and GLM use OpenAI-compatible function calling plus streamed chat completions; Custom AI can implement `/chat/tool` and `/chat`.
- PASS: `pnpm prisma validate`.
- PASS: `pnpm exec tsc --noEmit`.
- PASS: full Jest via `pnpm exec jest --runInBand`: 39 suites passed, 1 skipped; 276 tests passed, 1 skipped.
- PASS: `pnpm build`. Build completed with known database-unreachable warnings for the configured Neon host during static collection.
- PASS: Dev server booted at `http://localhost:3000` after sandbox bind approval. Elevated HTTP smoke returned 307 from `/chat` to sign-in and 200 from `/auth/signin`.
- BLOCKED: Authenticated live AI provider/tool execution remains unverified because this environment has no signed-in session and the configured database is unreachable.

## AI Provider Test Continuation

Date: 2026-07-10

- FIXED: Added mocked provider-adapter coverage for Anthropic native `tool_use`, Anthropic streaming message deltas, OpenAI-compatible function calling, OpenAI-compatible SSE streaming, Custom AI `/chat/tool`, Custom AI bearer auth, and Grok/GLM provider selection.
- PASS: `pnpm exec jest src/services/ai/__tests__/providers.test.ts --runInBand`: 1 suite passed, 6 tests passed.
- PASS: `pnpm exec tsc --noEmit`.
- PASS: full Jest via `pnpm exec jest --runInBand`: 40 suites passed, 1 skipped; 282 tests passed, 1 skipped.
- PASS: `pnpm prisma validate`.
- PASS: `pnpm build`. Build completed with the known configured Neon database-unreachable warnings during static collection.
- BLOCKED: Authenticated live AI provider/tool execution remains unverified because this environment has no signed-in session and the configured database is unreachable.

## Flowday Pass

Date: 2026-07-10

- PASS: `pnpm prisma validate`.
- PASS: `pnpm prisma migrate status` reached the configured Neon database and reported the Flowday customization migration pending.
- PASS: `pnpm prisma migrate deploy` applied `20260710110000_flowday_customization`.
- PASS: `pnpm tsc --noEmit`.
- PASS: full Jest via `pnpm test:unit`: 40 suites passed, 1 skipped; 282 tests passed, 1 skipped.
- PASS: `pnpm build` completed successfully. It logged existing intermittent Neon reachability warnings during static page collection, but exited 0.
- PASS: live localhost smoke at `http://localhost:3000/calendar` loaded the Flowday shell, left sidebar, mini-month, AI Chat entry, search command bar, nav items, and `#1B1D1E` body background.
- PASS: live mobile smoke at 390px showed no horizontal overflow.
- PASS: command palette opens from the sidebar command bar and renders the Flowday-styled command/search surface.
- PASS: PWA manifest names Flowday and uses Flowday background/accent colors; service worker cache/sync/notification labels were renamed to Flowday.
- PASS: scheduler engine files were not rewritten in this pass; AI still calls the deterministic scheduler through existing server tools.
- BLOCKED: authenticated live task creation via modal and calendar-slot click could not be completed because the browser had no signed-in local session.
- BLOCKED: AI chat with a real provider key, streaming provider responses, tool execution, and destructive confirmation could not be live-tested without an authenticated session and user-owned API key.

## Motion Parity - Calendar, Auth, Performance

Date: 2026-07-11

- MEASURED IN CHROME: Motion calendar toolbar controls are 25px high with `rgb(49, 53, 56)` background, `rgb(58, 63, 66)` 1px border, 6px radius, 13px/500 type, 3px 6px padding, and a 17px line height. Motion's week grid begins at x=244 with a 44-45px day header; its time-axis text is 10px/400 `rgb(155, 161, 166)`.
- FIXED: Flowday calendar controls now use those measured values, and day headers use a 44px height. The calendar transition is a 150ms ease-out fade; toolbar buttons no longer lift or scale.
- FIXED: Removed the nested NextAuth session provider inside the authenticated app layout. The profile entry holds an avatar-sized placeholder while the single root session resolves, preventing a false Sign In control during hydration.
- FIXED: Week view no longer duplicates calendar/task fetches on mount and skips state updates when calendar item content is unchanged.
- PASS: `pnpm tsc --noEmit`.
- PASS: `pnpm test:unit`: 40 suites passed, 1 skipped; 282 tests passed, 1 skipped.
- PASS: `pnpm build` completed successfully. Static collection emitted the existing intermittent configured-Neon unreachable warnings but exited 0.
- BLOCKED: Chrome local authentication with the supplied test account did not complete because the development server could not reach the configured Neon database; production Chrome remained authenticated and was used for the live comparison. No credential or account data was changed.

## Motion Parity - Settings Shell

Date: 2026-07-11

- MEASURED IN CHROME: Motion settings replaces the regular product rail with a 244px settings rail. Main content starts at x=278 (34px inner gutter), headings are 18px/600/28px, category labels are 13px/500 `rgb(105, 113, 119)`, and selected settings items are 30px high with a 2px radius, 10px left padding, and `rgb(43, 47, 49)` background.
- FIXED: Flowday now uses that settings-only rail, measured content gutter, title size, category/item density, selected state, and 150ms color-only hover treatment. Existing settings panels remain wired to their original stores and APIs.
- FIXED: Shared settings sections are flat content groups with Motion-like dividers rather than nested raised cards.
- PASS: `pnpm tsc --noEmit`.
- PASS: `pnpm test:unit`: 40 suites passed, 1 skipped; 282 tests passed, 1 skipped.
- PASS: `pnpm build` completed successfully with the existing intermittent configured-Neon unreachable warnings during static collection.
- BLOCKED: After the build, Chrome rejected the local settings navigation with a client-side localhost block; the signed-in production Flowday tab was used for its before-state and Motion was used for all measured target values.

## Motion Parity - Menus and Modals

Date: 2026-07-11

- MEASURED IN CHROME: Motion's create-event editor is 614px wide with an 8px radius, `rgb(38, 41, 43)` main surface, `rgb(49, 53, 56)` border, 24px header padding, and a 150ms ease-out transform. Its event-title input is 18px with a 32px line height.
- FIXED: Shared Flowday dialogs, menus, popovers, and command palette now use the measured elevated surface/border/radius system and short fade/scale transitions. The task editor no longer uses a spring animation; the event editor adopts the Motion width and header surface.
- PASS: `pnpm tsc --noEmit`.
- PASS: `pnpm test:unit`: 40 suites passed, 1 skipped; 282 tests passed, 1 skipped.
- PASS: `pnpm build` completed successfully with the existing intermittent configured-Neon unreachable warnings during static collection.
- BLOCKED: Local authenticated creation flows could not be replayed in Chrome because the configured database was unreachable and the browser subsequently blocked localhost navigation. No create/update/delete operation was submitted.
