# 01 — Scheduling and task lifecycle

**Model:** GPT-5.6 Sol High — this touches the deterministic engine and task
data; a wrong placement or a lost recurrence master is expensive.

**Ships independently.** No workspace concepts here; everything stays
`userId`-scoped. Later plans build on top.

**Status:** complete (2026-08-08).

## Context (verified against the code)

- `hardDeadline` already exists as a `Boolean` on Task (`prisma/schema.prisma:354`),
  alongside `isFrozen` (`:357`). The field is present but the engine does not
  honour it.
- The engine only searches working windows (`src/services/scheduling/engine.ts:469-524`),
  so a task that cannot fit inside work hours is simply reported as unscheduled
  even when its deadline is about to be missed.
- Recurrence currently mutates the master row and writes a completed copy
  (`src/app/api/tasks/[id]/route.ts:159-255`), so editing a series rewrites
  history instead of affecting future occurrences only.
- Motion's documented behaviour: a hard-deadline task may be scheduled outside
  working hours when that is the only way to meet the deadline.

## Non-goals

- No workspaces, assignees, or sharing — plan 02.
- No UI redesign — plan 03.
- No physical deletion of anything.

## Tasks

### 1.1 Complete the task lifecycle fields

Add `isArchived`, `archivedAt`, and `availableFrom` to Task; confirm
`hardDeadline` semantics and document them. Additive migration with backfill
defaults.

*Validate:* `npx prisma validate && npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url "$SHADOW_DATABASE_URL" --exit-code` then `npm run type-check`

### 1.2 Enforce earliest start

The engine must never place a task before `availableFrom`, `startDate`, or a
postponement. Return `BEFORE_EARLIEST_START` when that is what blocks it.

*Validate:* `npm run test:unit -- engine`

### 1.3 Priority hierarchy

Implement the ordering: ASAP (legacy `URGENT` maps to it) → hard deadline →
soft deadline → priority → duration → start date/recurrence. The comparison
must be total and deterministic — equal inputs always produce equal output.

*Validate:* `npm run test:unit -- engine`

### 1.4 Hard-deadline overflow

A hard-deadline task first tries working windows. If it still does not fit
before the deadline, it may use free time outside the schedule, but it must
never overlap a Busy calendar event, and it must never do this for tasks
without a hard deadline. Autoscheduling still respects Work Schedule for
everything else.

*Validate:* `npm run test:unit -- engine`

### 1.5 Exact unscheduled reasons

Return precise codes instead of a generic failure: `NO_WORKING_TIME`,
`BEFORE_EARLIEST_START`, `DEPENDENCY_BLOCKED`, `DEADLINE_IMPOSSIBLE`,
`NO_DURATION`, `ENERGY_WINDOW_UNAVAILABLE`, `HARD_DEADLINE_MISSED`. Surface
them in the UI so the user sees why a task did not land.

*Validate:* `npm run test:unit && npm run type-check`

### 1.6 Archive instead of delete

Archive and restore for tasks; `archived=true` filter in the task API.
Archived tasks are read-only and are never scheduled. Replace any physical
delete path with archiving.

*Validate:* `npm run test:unit && npm run test:e2e -- tasks`

### 1.7 Recurrence master/instance

Rework recurrence into explicit master → instance relations. Editing the master
affects future instances only; completing an instance never rewrites the
master. Migrate existing series without losing history.

*Validate:* `npm run test:unit -- recurrence` and a concurrency test proving two
simultaneous edits cannot create duplicate instances

## Definition of done

Gates from `AGENTS.md`, `CHANGELOG.md` updated, one scoped commit, green CI.
No push, no deploy.
