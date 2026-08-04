# 02 — Workspaces, projects, security

**Model:** GPT-5.6 Sol High throughout. This is the riskiest migration in the
project's history: it adds a tenancy boundary to data that currently has none.

**Prerequisite:** plan 01 deployed and smoke-tested.

## Context (verified against the code)

- There is no `Workspace` model. Ownership is `userId` only
  (`prisma/schema.prisma:280-307`, `325-464`).
- `TaskDependency` (`prisma/schema.prisma:615-628`) does not constrain
  dependencies to a single project.
- Deleting a project physically deletes its tasks
  (`src/app/api/projects/[id]/route.ts:137-155`).
- Project progress is set by hand (`src/components/projects/ProjectModal.tsx:33-81`).
- Calendar events carry full details (`prisma/schema.prisma:151-231`), so naive
  sharing would leak titles of personal events.
- Motion's own documentation is inconsistent about roles: the reference page
  lists Owner/Admin/Member/Guest, the how-to says all members are equal. Needt
  fixes its own model: **Owner / Editor / Viewer**, plus per-page overrides in
  plan 04.

## Non-goals

- No seat billing. Every member of a shared workspace holds their own
  PRO/LIFETIME plan.
- No cross-workspace views or aggregation of any kind.
- No removal of the existing `userId` columns — that is a later contract release.

## Rollout safety (do this first, not last)

Adding tenancy touches nearly every query. Before any behaviour changes:

1. Take and **verify** a database backup — restore it into a scratch database
   and check row counts. Record the result.
2. Ship the schema and backfill behind a server-controlled flag
   (`workspaces`), default off, with a per-user allowlist.
3. Old `userId`-scoped reads keep working while the flag is off. Both paths must
   pass tests until the flag reaches 100%.
4. Document the rollback: disable the flag; the additive columns stay and are
   ignored.

*Validate:* restore drill recorded in `docs/operations-runbook.md`

## Tasks

### 2.1 Schema and backfill

Add `Workspace`, `WorkspaceMember`, `WorkspaceInvite`. Create a personal
workspace for every existing user and attach their existing data to it. The
backfill must be idempotent and re-runnable, and must report a count of rows
left unassigned (which must be zero).

*Validate:* `npx prisma validate` and a backfill test asserting zero orphaned rows

### 2.2 Single authorization helper

One server-side helper resolves membership and role for every authenticated
route. A workspace ID in a request, a room ID, or a share link is never itself
proof of access. Client-side checks are not a boundary.

*Validate:* `npm run test:unit -- workspace-auth`

### 2.3 Roles and invites

Owner / Editor / Viewer. The last Owner cannot be removed. A FREE user can
neither create a shared workspace nor be invited into one; both sides need
PRO/LIFETIME. Invites expire and are single-use.

*Validate:* `npm run test:e2e -- workspace-invites` with seeded FREE/PRO/LIFETIME users

### 2.4 Task ownership and assignment

Task gains `workspaceId`, a single `assigneeId`, busy/free, `stageId`, and
activity. A task in a shared workspace defaults to its creator. An unassigned
task is not scheduled — reason `NO_ASSIGNEE`.

*Validate:* `npm run test:unit -- engine` and `npm run type-check`

### 2.5 Scheduling against the assignee

Scheduling uses the assignee's work schedule and busy intervals. Other members
see **busy/free only** — never titles, descriptions, attendees or locations of
another member's personal events.

*Validate:* `npm run test:unit -- calendar-privacy` asserting no event detail crosses a member boundary

### 2.6 Projects

Stages, blockers, derived progress (replacing the manual field), List / Kanban /
Gantt views, regular and workflow templates, placeholder roles, relative dates.
Remove the manual progress control only after the UI migration lands.

*Validate:* `npm run test:unit && npm run test:e2e -- projects`

### 2.7 Dependencies scoped to a project

New dependencies must stay inside one project. Existing cross-project links
remain readable and are not deleted. Moving a task is blocked while a
conflicting link exists, with a message naming the blocker.

*Validate:* `npm run test:unit -- dependencies`

### 2.8 Project archive replaces delete

Archiving is read-only and restorable. The old `DELETE` route becomes archive;
tasks are never destroyed.

*Validate:* `npm run test:e2e -- projects` and a test asserting no task rows are removed

### 2.9 Security review (Sol High)

Reviews only: workspace isolation, invite abuse, entitlement bypass through the
API rather than the UI, calendar privacy, and migration correctness. Fixes are
committed into the task they belong to; a separate audit commit only if code
actually changed.

*Validate:* full gates plus targeted IDOR tests attempting cross-workspace reads and writes

## Definition of done

Gates from `AGENTS.md`, backfill verified, flag documented with rollback,
`CHANGELOG.md` updated, one scoped commit per task, green CI. No push, no deploy.
