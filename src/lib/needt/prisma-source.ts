/* THE PRISMA SOURCE — server-only. See the seam at the bottom of
 * `adapter.ts`: nothing in `src/components/**` may import this module, and it
 * must keep the two rules that comment states — a capability with no honest
 * value returns `null` (not `[]`, not `0`), and nothing here is derived on
 * the way out. The chain, the streak, `blocking()` all stay pure functions in
 * `derive.ts` that run on whatever list a caller holds; this file only reads.
 *
 * This module is server-only by convention rather than by an enforced
 * `server-only` import (the package isn't a project dependency): it imports
 * `@/lib/prisma`, which talks to Postgres, so nothing under
 * `src/components/**` may import this file — only a route handler or another
 * server-only module should.
 */
import {
  type WorkspaceAccess,
  workspaceDataScopeWhere,
} from "@/lib/auth/workspace-auth";
import {
  addCalendarDays,
  newDate,
  startOfDay,
  toLocalDateKey,
} from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";

import type { NeedtDataSource } from "./adapter";
import { taskNeedtInclude, toNeedtTask } from "./task-view";
import type {
  NeedtCalendarMap,
  NeedtDayMark,
  NeedtHabit,
  NeedtPerson,
  NeedtProject,
  NeedtStage,
  NeedtTask,
} from "./types";

/* Projects and people the fixture ships with a hue and a glyph/initials
   authored by hand; a real row can have `color`/`icon`/`hue`/`initials` still
   unset. The contract requires both, so an unset one falls back to a neutral
   placeholder here. This is NOT the "no fallback" rule from derive.ts's
   `project()` — that rule is about never inventing WHICH project a task
   belongs to. This is about a real, known project simply not having picked a
   colour yet. */
const FALLBACK_HUE = "var(--muted-foreground)";
const FALLBACK_GLYPH = "circle";

/** The last fourteen days, oldest first, ending on `startOfDay(now)`. */
function fourteenDayWindow(now: Date): readonly Date[] {
  const end = startOfDay(now);
  return Array.from({ length: 14 }, (_, i) => addCalendarDays(end, i - 13));
}

/** A fourteen-day mark array: 1 for each window day present in `onDates`. */
function markWindow(
  window: readonly Date[],
  onDates: Iterable<Date>
): readonly NeedtDayMark[] {
  const marked = new Set<string>();
  for (const date of onDates) marked.add(toLocalDateKey(date));
  return window.map(
    (day): NeedtDayMark => (marked.has(toLocalDateKey(day)) ? 1 : 0)
  );
}

function initialsOf(name: string | null): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0] ?? "";
  const second = words.length > 1 ? (words[1][0] ?? "") : "";
  return (first + second).toUpperCase();
}

/** Four global stages, the same for every project — see `TaskStage` in
 * `schema.prisma` and the header of `types.ts`. Not a query: this list is
 * fixed by the enum, not by any table. */
const GLOBAL_STAGES: readonly NeedtStage[] = Object.freeze([
  { id: "todo", name: "To do" },
  { id: "doing", name: "In progress" },
  { id: "review", name: "In review" },
  { id: "done", name: "Done" },
]);

async function getTasks(
  userId: string,
  workspace: WorkspaceAccess,
  now: Date
): Promise<readonly NeedtTask[]> {
  const scope = workspaceDataScopeWhere(workspace, userId);
  const rows = await prisma.task.findMany({
    where: {
      ...scope,
      isArchived: false,
    },
    include: taskNeedtInclude,
    orderBy: { createdAt: "desc" },
  });
  const visibleIds = new Set(rows.map((row) => row.id));
  return rows.map((row) => {
    const task = toNeedtTask(row, now);
    return task.blockedBy && !visibleIds.has(task.blockedBy)
      ? { ...task, blockedBy: undefined }
      : task;
  });
}

async function getProjects(
  userId: string,
  workspace: WorkspaceAccess
): Promise<readonly NeedtProject[]> {
  const rows = await prisma.project.findMany({
    where: {
      ...workspaceDataScopeWhere(workspace, userId),
      status: "active",
    },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(
    (row): NeedtProject => ({
      id: row.id,
      name: row.name,
      hue: row.color ?? FALLBACK_HUE,
      glyph: row.icon ?? FALLBACK_GLYPH,
    })
  );
}

async function getPeople(
  userId: string,
  workspace: WorkspaceAccess
): Promise<readonly NeedtPerson[]> {
  //todo Owner decision: if task holders/waits may include outside contacts,
  // extend this registry without weakening workspace membership authorization.
  if (workspace.dataScope.mode === "workspace") {
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: workspace.dataScope.workspaceId },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            initials: true,
            hue: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return members.map(
      ({ user }): NeedtPerson => ({
        id: user.id,
        name: user.name ?? user.email ?? "Unknown",
        initials: user.initials ?? initialsOf(user.name),
        hue: user.hue ?? FALLBACK_HUE,
      })
    );
  }

  const scope = workspaceDataScopeWhere(workspace, userId);
  const [assignees, waitedOn] = await Promise.all([
    prisma.task.findMany({
      where: { ...scope, assigneeId: { not: null } },
      select: { assigneeId: true },
      distinct: ["assigneeId"],
    }),
    prisma.taskWait.findMany({
      where: { resolvedAt: null, task: scope },
      select: { waitingOnUserId: true },
      distinct: ["waitingOnUserId"],
    }),
  ]);

  const ids = new Set<string>([userId]);
  for (const { assigneeId } of assignees) if (assigneeId) ids.add(assigneeId);
  for (const { waitingOnUserId } of waitedOn) ids.add(waitingOnUserId);

  const users = await prisma.user.findMany({ where: { id: { in: [...ids] } } });
  return users.map(
    (user): NeedtPerson => ({
      id: user.id,
      name: user.name ?? user.email ?? "Unknown",
      initials: user.initials ?? initialsOf(user.name),
      hue: user.hue ?? FALLBACK_HUE,
    })
  );
}

async function getHabits(
  userId: string,
  workspace: WorkspaceAccess,
  now: Date
): Promise<readonly NeedtHabit[]> {
  const window = fourteenDayWindow(now);
  const rows = await prisma.habit.findMany({
    where: {
      ...workspaceDataScopeWhere(workspace, userId),
      archivedAt: null,
    },
    include: {
      project: { select: { name: true } },
      completions: { where: { date: { gte: window[0] } } },
    },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(
    (row): NeedtHabit => ({
      id: row.id,
      title: row.title,
      at: row.at,
      project: row.project?.name ?? null,
      quota: row.quota,
      done: markWindow(
        window,
        row.completions.map((completion) => completion.date)
      ),
    })
  );
}

async function getClosedDays(
  userId: string,
  now: Date
): Promise<readonly NeedtDayMark[]> {
  const window = fourteenDayWindow(now);
  const rows = await prisma.closedDay.findMany({
    where: { userId, date: { gte: window[0] } },
  });
  return markWindow(
    window,
    rows.map((row) => row.date)
  );
}

async function getCalendars(userId: string): Promise<NeedtCalendarMap> {
  const feeds = await prisma.calendarFeed.findMany({
    where: { userId, enabled: true },
  });
  const map: Record<string, { name: string; color: string }> = {};
  for (const feed of feeds) {
    map[feed.id] = { name: feed.name, color: feed.color ?? FALLBACK_HUE };
  }
  return map;
}

/**
 * The database-backed `NeedtDataSource`, scoped by a server-authorized
 * workspace access object. A request-supplied workspace id is never enough:
 * callers must resolve membership before constructing the source.
 *
 * `now` defaults to the real clock; a caller can pin it (tests, and any
 * screen that wants every read in one render judged against the same
 * instant).
 */
export function prismaDataSource(
  userId: string,
  workspace: WorkspaceAccess,
  now: () => Date = newDate
): NeedtDataSource {
  return {
    getTasks: () => getTasks(userId, workspace, now()),
    getProjects: () => getProjects(userId, workspace),
    getPeople: () => getPeople(userId, workspace),
    getHabits: () => getHabits(userId, workspace, now()),
    getStages: async () => GLOBAL_STAGES,
    getCalendars: () => getCalendars(userId),
    getClosedDays: () => getClosedDays(userId, now()),
  };
}

/** Exported for tests that want to check the window math without a database. */
export const __internal = { fourteenDayWindow, markWindow, initialsOf };
