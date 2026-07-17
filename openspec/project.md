# Project Context

## Purpose

Needt is a single intelligent planner product built from the FluidCalendar fork. It ships
from one source tree as one Next.js application and one production build.

## Tech Stack

Next.js 15 (App Router) · React 19 · TypeScript · Prisma + PostgreSQL · NextAuth.js (v4) ·
Zustand · TanStack Query · FullCalendar · Tailwind + shadcn/ui (Radix) · Zod.

## Project Conventions

### Code Style

- **Prisma client**: import the singleton `prisma` from `@/lib/prisma`; never `new PrismaClient()`. Import Prisma *types* from `@prisma/client`.
- **Dates**: use helpers in `@/lib/date-utils.ts` for all date work (including `new Date()`); don't reach for `date-fns`/`date-fns-tz` directly.
- **Calendar DB access**: go through `@/lib/calendar-db.ts`.
- **Logging**: use `logger` from `@/lib/logger`, never `console.log`. Define a `LOG_SOURCE` string per file and pass it last: `logger.error("msg", { error }, LOG_SOURCE)`.
- **API route handlers** (Next 15): `params` is a Promise - `const { id } = await params;`.
- **Admin-only**: API routes use `requireAdmin` from `@/lib/auth/api-auth`; UI uses the `useAdmin` hook or `<AdminOnly>` wrapper.
- **JSX text**: escape quotes/apostrophes as `&apos;` / `&quot;`.
- No em dashes in copy; use hyphens, commas, or rephrase.
- Keep changes minimal and scoped; don't refactor unrelated code. Don't remove `//todo` comments; add them for deferred work.

### Architecture Patterns

- **Local-first calendar sync.** External calendars (Google / Outlook / CalDAV) are never read live in the UI; each provider syncs into our DB (`CalendarFeed` + `CalendarEvent`) and the app always operates on local data. Provider logic lives in `src/lib/{google,outlook,caldav}-*.ts` and `src/lib/token-manager.ts`.
- **Task scheduling engine** (`src/services/scheduling/`): `TaskSchedulingService` orchestrates auto-scheduling; `TimeSlotManager` enumerates candidate slots; `SlotScorer` ranks them; `CalendarServiceImpl` checks availability.
- **Task sync** (`src/lib/task-sync/`): one-way sync from external task providers using selective field sync (external-owned fields overwritten each sync; local-owned fields preserved).
- **Scheduled maintenance**: existing handlers live in `src/app/api/cron/`; a separate worker is intentionally outside the current build.
- **State**: small focused Zustand stores in `src/store/`; server state via TanStack Query; cmdk commands in `src/lib/commands/`.

### Unified build (critical)

- Keep one source tree and one production build. Do not introduce edition flags, repository-sync gates, or parallel product variants.
- `next.config.js` uses standard Next.js page extensions.
- `src/app/(app)/` is only a structural group for the shared application shell.
- Components, routes, and services use plain `.ts` and `.tsx` filenames.

### Testing Strategy

- Unit tests: Jest (Node env), `src/**/__tests__/**/*.test.ts` - `npm run test:unit`.
- E2E: Playwright in `tests/` - `npm run test:e2e` (needs a server on `TEST_BASE_URL`/localhost:3000).
- Gates (CI requires zero lint warnings): `npm run type-check`, `npm run lint`. Husky pre-commit runs `lint-staged` (eslint zero-warnings + prettier + type-check on staged files).
- Install with `npm install --legacy-peer-deps` (React 19 peer-dep conflicts). Node version pinned in `.nvmrc` (22.x).

## Domain Context

Single Needt product with one application build. Auto-scheduling assigns
`scheduledStart/End` and a `scheduleScore` to tasks marked `isAutoScheduled`. User-facing
changes are recorded in `CHANGELOG.md` under `[Unreleased]`.

## Important Constraints

- Keep product behavior in the unified build unless an explicit requirement says otherwise.

## External Dependencies

PostgreSQL · Google / Microsoft (Outlook) / CalDAV calendar + task APIs · NextAuth OAuth providers.
