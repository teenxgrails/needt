# Architecture

This document captures the Phase 0 baseline for the FluidCalendar fork before the Mina Calendar planner changes.

## Current Fork Additions

The fork now presents the app as `teenx planner` through `src/lib/app-config.ts`, while preserving upstream attribution and license text.

Single-user mode is enforced by disabling public signup/registration and SaaS surfaces. Auth remains NextAuth-backed, with first-run setup as the local account creation path.

The scheduling stack has two layers:

- `src/services/scheduling/engine.ts`: pure deterministic scheduler. It accepts schedulable tasks, busy blocks, energy profile windows, preferences, and `now`; it returns placed blocks, frozen blocks, and unscheduled overflow reasons.
- `src/services/scheduling/TaskSchedulingService.ts`: database adapter. It reads tasks/settings/calendar busy time from Prisma, calls the pure engine, and persists the first visible task block into the current `Task` scheduling fields.

Smart scheduling data is stored on `Task`, `EnergyProfileWindow`, and `SchedulingPreferences`. `Settings -> Smart Scheduling` reads/writes the energy curve and ADHD preferences.

The optional AI layer lives under `src/services/ai`. `AISettings` stores provider choice, encrypted BYO key, custom endpoint, model, and allowed actions. `None` remains the default. API routes under `/api/ai/*` parse brain dumps and request schedule suggestions, always falling back to deterministic behavior if the provider fails.

The ADHD planning surface lives in `src/components/calendar/SmartPlanningPanel.tsx` and is mounted inside the calendar sidebar. It provides brain dump parsing, energy timeline, overcommitment warning, buffer visibility, quick reschedule, and shutdown ritual.

The local connector API uses `ConnectorSettings` with a hashed personal bearer token. `/api/connect/tasks`, `/api/connect/schedule`, and `/api/connect/reschedule` let local tools create tasks, read schedule state, and trigger scheduling. Optional outbound webhooks are best-effort.

Phase 9 adds time tracking and calibration. `TimeEntry` stores timer/manual/focus sessions, while `Task` stores three-point estimates (`estOptimistic`, `estLikely`, `estPessimistic`) plus actual-minute deltas. `src/services/time-tracking/timeEntries.ts` owns timer writes and task actual rollups. `src/services/time-tracking/calibration.ts` computes median actual/likely correction factors per `contextTag`; `TaskSchedulingService` injects those factors into the pure scheduler, and `/api/calibration` exposes the report to the planning UI and AI layer.

## Stack

- Next.js 15 App Router with React 19 and TypeScript.
- Prisma with PostgreSQL as the configured datasource.
- NextAuth.js for authentication.
- FullCalendar for the day, week, month, and multi-month calendar views.
- Zustand stores for client-side calendar, task, settings, focus, project, and navigation state.

## Current Scheduling Flow

The current auto-scheduler entry point is `src/services/scheduling/TaskSchedulingService.ts`.

`scheduleAllTasksForUser(userId)`:

1. Loads the user's `AutoScheduleSettings`.
2. Selects tasks where `isAutoScheduled = true`, `scheduleLocked = false`, status is not `completed` or `in_progress`, and `userId` matches.
3. Separately loads locked auto-scheduled tasks so their existing slots stay visible to the scheduler.
4. Clears `scheduledStart`, `scheduledEnd`, and `scheduleScore` for unlocked tasks.
5. Instantiates `SchedulingService` with the loaded settings.
6. Calls `SchedulingService.scheduleMultipleTasks([...unlocked, ...locked], userId)`.
7. Updates `lastScheduled` on the tasks returned by the scheduling service.
8. Refetches tasks with tags and project relations and returns them to the API route.

`src/app/api/tasks/schedule-all/route.ts` authenticates the request, calls `scheduleAllTasksForUser`, then calls `repushDirtyBlocks(userId)` so dirty pushed task blocks can be synchronized to the configured calendar.

`src/services/scheduling/SchedulingService.ts` is not pure today. It imports Prisma, date helpers, the settings store fallback, and `CalendarServiceImpl`. It:

- Loads the user's timezone from `UserSettings`.
- Builds a `TimeSlotManagerImpl`.
- Scores every unlocked task by looking for available slots within a one-week window.
- Sorts tasks by the best score descending.
- Schedules each task into the highest-scoring slot and writes `scheduledStart`, `scheduledEnd`, `duration`, `scheduleScore`, `isAutoScheduled`, and `userId` directly to Prisma.
- Adds each newly scheduled task to the in-memory conflict list so later tasks do not overlap it.

`src/services/scheduling/TimeSlotManager.ts` generates potential slots from now through the scheduling window, filters by work days and work hours, removes conflicts from selected calendars and scheduled tasks, marks buffer availability, scores slots, and sorts by score.

`src/services/scheduling/SlotScorer.ts` scores slots using work-hour alignment, energy-level match, project proximity, buffer adequacy, preferred time, deadline proximity, and task priority. Energy windows come from `AutoScheduleSettings` integer hour fields.

## Current Scheduler Behavior

- Only tasks explicitly marked `isAutoScheduled` are scheduled.
- Locked tasks are not moved and are used as conflicts for unlocked tasks.
- Completed and in-progress tasks are skipped.
- Unlocked scheduled times are cleared before a scheduling run.
- The scheduling horizon is one week.
- Missing task duration defaults to 30 minutes.
- Slots are generated at task-duration intervals and rounded up to 30-minute boundaries.
- Work days and selected calendar IDs are stored as JSON strings in `AutoScheduleSettings`.
- Calendar conflicts come from selected calendar feeds only.
- All-day calendar events are ignored as busy time in the batch conflict path.
- Pushed task-block echoes are skipped by `CalendarServiceImpl.findBatchConflicts`.
- Buffer time currently affects scoring but does not reserve the buffer interval as unavailable time.
- Energy matching is score-based; high-energy tasks are not strictly constrained to high-energy windows.
- Task ordering is score-based, not a dedicated priority/dependency/deadline topological pass.
- Tasks are not split into chunks.
- Overcommitment is implicit: a task that gets no slot is simply omitted from the returned scheduled updates.

## Prisma Schema

The Prisma schema is in `prisma/schema.prisma`.

Core models:

- `User`: NextAuth user with role, settings, calendars, tasks, projects, connected accounts, tags, jobs, task providers, changes, and password reset relations.
- `Account`, `Session`, `VerificationToken`: NextAuth persistence.
- `ConnectedAccount`: external account credentials for Google, Outlook, and CalDAV. CalDAV stores `caldavUrl` and `caldavUsername`; credentials are currently stored in `accessToken`.
- `CalendarFeed`: local or external calendar feed, with provider type, sync metadata, CalDAV path/ctag, account, and user relation.
- `CalendarEvent`: normalized events for FullCalendar, including recurrence/master-instance fields.
- `Task`: task data, including `dueDate`, `startDate`, `duration`, string priority/energy/preferred-time fields, scheduling flags/timestamps, external task sync metadata, pushed block metadata, recurrence, tags, project, and user.
- `Project` and `Tag`: organization.
- `AutoScheduleSettings`: work days, work hours, selected calendars, buffer minutes, energy-hour windows, project grouping, and Google task-block push settings.
- `UserSettings`, `CalendarSettings`, `NotificationSettings`, `IntegrationSettings`, `DataSettings`, `SystemSettings`: user and app settings.
- `TaskProvider`, `TaskListMapping`, `TaskChange`: Google/Outlook/CalDAV task-list sync.
- `Log`, waitlist/beta models, `JobRecord`, and `PasswordReset`: logging, SaaS/beta remnants, jobs, and account recovery.

## Calendar Sync Services

Google:

- OAuth routes live under `src/app/api/calendar/google/*`.
- Google Calendar API helpers live in `src/lib/google.ts` and `src/lib/google-calendar.ts`.
- Google Tasks provider lives in `src/lib/task-sync/providers/google-provider.ts`.
- Tokens are refreshed through `src/lib/token-manager.ts`.

Outlook:

- OAuth and calendar routes live under `src/app/api/calendar/outlook/*`.
- Microsoft Graph constants and types live in `src/lib/outlook.ts`.
- Graph client creation lives in `src/lib/outlook-utils.ts`.
- Calendar sync lives in `src/lib/outlook-sync.ts`.
- Outlook task sync provider lives in `src/lib/task-sync/providers/outlook-provider.ts`.

CalDAV:

- Account, available-calendar, event, sync, and test routes live under `src/app/api/calendar/caldav/*`.
- CalDAV connection utilities live in `src/app/api/calendar/caldav/utils.ts`.
- Event sync/create/update/delete service lives in `src/lib/caldav-calendar.ts`.
- VTODO task sync provider and field mapper live in `src/lib/task-sync/providers/caldav-provider.ts` and `src/lib/task-sync/providers/caldav-field-mapper.ts`.

## Auth Flow

`src/lib/auth/auth-options.ts` builds NextAuth options. It configures:

- Google provider with calendar, calendar events, and tasks scopes.
- Azure AD provider with Microsoft Graph scopes from `src/lib/outlook.ts`.
- Credentials provider backed by `src/lib/auth/credentials-provider.ts`.
- JWT sessions with a one-year max age.

OAuth credentials can be stored in `SystemSettings` or supplied through env vars. The sign-in page is `/auth/signin`, the auth route is `src/app/api/auth/[...nextauth]/route.ts`, and route protection runs through `src/middleware.ts`.

The first-run setup flow creates an admin user and default settings through `src/app/api/setup/route.ts`.

## FullCalendar Integration

The calendar page is `src/app/(common)/calendar/page.tsx`. It reads the NextAuth token, loads the current user's `CalendarFeed` and `CalendarEvent` rows from Prisma, maps them into app types, and renders `src/components/calendar/Calendar.tsx`.

`Calendar.tsx` hydrates the calendar store with initial feeds/events, fetches tasks through the task store, and renders:

- `DayView`
- `WeekView`
- `MonthView`
- `MultiMonthView`

Each view wraps `@fullcalendar/react` with the relevant FullCalendar plugins. The views wire event click, date selection, drag/drop, resize, business hours, date range loading, and custom event rendering through `CalendarEventContent`, `EventQuickView`, `EventModal`, and `TaskModal`.

## Phase 0 Local Run Notes

- The repository has `package-lock.json` but the desktop runtime did not expose `npm`; Phase 0 used the bundled pnpm executable only to run `npm@10.9.3` against the existing npm lockfile.
- Native dependency build scripts had to run for Prisma, bcrypt, better-sqlite3, esbuild, sharp, and related packages.
- The local development database is expected at `postgresql://fluid:fluid@localhost:5432/fluid_calendar`.
- Docker, Postgres, `psql`, `pg_isready`, Colima, and Podman were not available on the shell path, so the bundled Postgres service could not be started from this environment.
- `prisma validate` passed with `DATABASE_URL` pointed at the local dev database URL.
- `tsc --noEmit` passed after installing dependencies from `package-lock.json`.
- `next build` passed. During static generation it logged Prisma connection warnings because no local Postgres server was reachable at `localhost:5432`, but the build exited successfully.
- `next dev --turbopack` started successfully at `http://localhost:3000` after allowing the dev server to bind to the local port.
- `curl -I http://localhost:3000` returned `HTTP/1.1 200 OK`.
