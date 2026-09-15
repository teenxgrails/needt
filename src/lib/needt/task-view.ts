/* THE SERIALIZER — a Prisma task row, plus its includes, to `NeedtTask`.
 *
 * Pure on purpose: no `prisma` import, no `new PrismaClient()`, nothing that
 * talks to a database. `prisma-source.ts` decides what to query and hands the
 * result here; this file only knows how to read the shape it is given. That
 * split is what makes every rule below testable with hand-built rows instead
 * of a live database — see `__tests__/task-view.test.ts`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THE FOUR DUPLICATIONS — `CLAUDE.md` forbids collapsing these; this module
 * picks a side for each and says why, once, here:
 *
 *   `dueDate` vs `deadline`      → `dueDate`. It is the plain day the user
 *                                  sees; `deadline`/`hardDeadline` feed the
 *                                  scheduling engine's own harder constraint
 *                                  and are a different fact wearing a similar
 *                                  name.
 *   `duration` vs `estimatedMinutes` → `estimatedMinutes`. `duration` is the
 *                                  older column; every newer estimate field
 *                                  (`estOptimistic`, `estLikely`, …) was
 *                                  added next to `estimatedMinutes`, not it.
 *   `Task.dependsOnId` vs `TaskDependency` → `dependsOnId`. The contract's
 *                                  `blockedBy` is one task id, singular.
 *                                  `TaskDependency` is many-to-many; reading
 *                                  it here would mean silently picking one
 *                                  edge out of several and calling it THE
 *                                  blocker. `dependsOnId` already commits to
 *                                  "one blocker," which is what this field
 *                                  is.
 *   `isAutoScheduled` vs `autoScheduled` → neither. Nothing in `NeedtTask`
 *                                  represents "is this task auto-scheduled";
 *                                  `noSlot` is a separate, new, honest column
 *                                  (see below), not a rename of either.
 * ───────────────────────────────────────────────────────────────────────── */
import type { Prisma, TaskStage as PrismaTaskStage } from "@prisma/client";

import { calendarDayDifference, startOfDay } from "@/lib/date-utils";

import { dateLabel } from "./derive";
import type {
  NeedtStageId,
  NeedtTask,
  NeedtTaskStatus,
  TaskPart,
} from "./types";

/* ── The id shim ──────────────────────────────────────────────────────────
 *
 * `NeedtTask.id` is `number` because the contract was authored against the
 * fixture's small integer ids (1..26) — see `types.ts`. Real `Task.id`s are
 * cuid strings. Widening the contract to `string | number` was the obvious
 * fix and the wrong one: `id: number` is read in every screen under
 * `src/components/needt/**`, `types.ts` says not to redesign the seam, and a
 * union would just move this exact problem to every call site instead of
 * solving it once, here.
 *
 * So every cuid is folded through the same deterministic hash (FNV-1a,
 * 32-bit) into an unsigned int. It is not reversible, and at real scale it is
 * not collision-free — this is a shim, not a fix, and it is the one part of
 * the gap that turned out not to be portable at all. `blockedBy` folds the
 * referenced task's cuid through the same function, so the two agree within
 * one response, which is all `derive.ts` ever needs of them: `blockerOf` and
 * `unblocks` only compare ids that came from the same task list. */
const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

export function hashTaskId(cuid: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < cuid.length; i++) {
    hash ^= cuid.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
}

/* ── Small formatting helpers ─────────────────────────────────────────────
 *
 * These read fields off an already-constructed `Date`; they don't build one,
 * so they stay local rather than moving to `@/lib/date-utils`. */
function formatClock(date: Date): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

const GLOBAL_STAGE_TO_ID: Record<PrismaTaskStage, NeedtStageId> = {
  TODO: "todo",
  DOING: "doing",
  REVIEW: "review",
  DONE: "done",
};

/* ── The includes this serializer expects ─────────────────────────────────
 *
 * `prisma-source.ts` queries with exactly this shape; `Prisma.TaskGetPayload`
 * ties the row type to it so the two can't drift apart silently. */
export const taskNeedtInclude = {
  project: { select: { name: true } },
  parts: { orderBy: { position: "asc" } },
  waits: { where: { resolvedAt: null }, take: 1 },
  activities: {
    orderBy: { createdAt: "desc" },
    take: 1,
    select: { createdAt: true },
  },
} satisfies Prisma.TaskInclude;

export type NeedtTaskRow = Prisma.TaskGetPayload<{
  include: typeof taskNeedtInclude;
}>;

/** `Task.status` is a free-form string ('todo' | 'in_progress' | 'completed');
 * the contract's `status` only names the two open states and leaves a
 * completed task's status unset — `done` already carries that fact, and the
 * fixture never sets both (see fixture.ts tasks 9 and 10). Anything else
 * unrecognized is treated the same as "completed": absent, not a guess. */
function toNeedtStatus(status: string): NeedtTaskStatus | undefined {
  return status === "todo" || status === "in_progress" ? status : undefined;
}

/**
 * A Prisma task row (with `taskNeedtInclude`'s includes) to `NeedtTask`.
 *
 * `now` is threaded in rather than read with `new Date()` here, so a test can
 * pin it and so every task in one response is judged against the same
 * instant.
 */
export function toNeedtTask(row: NeedtTaskRow, now: Date): NeedtTask {
  const touchedAt = row.activities[0]?.createdAt ?? row.lastTouchedAt ?? null;
  const activeWait = row.waits[0];

  return {
    id: hashTaskId(row.id),
    title: row.title,
    project: row.project?.name ?? null,
    time: row.scheduledStart ? formatClock(row.scheduledStart) : undefined,
    status: toNeedtStatus(row.status),
    due: row.dueDate ? dateLabel(row.dueDate) : undefined,
    est: row.estimatedMinutes ?? undefined,
    done: row.status === "completed",
    at: row.scheduledStart ? row.scheduledStart.getHours() : undefined,
    noSlot: row.noSlot || undefined,
    age: touchedAt
      ? Math.max(
          0,
          calendarDayDifference(startOfDay(now), startOfDay(touchedAt))
        )
      : undefined,
    holder: row.assigneeId ?? undefined,
    stage: row.globalStage ? GLOBAL_STAGE_TO_ID[row.globalStage] : undefined,
    blockedBy: row.dependsOnId ? hashTaskId(row.dependsOnId) : undefined,

    /* Three-state fields (see the header of types.ts). Every one of these
       now has a real column or table, so DB-null/empty means "this task has
       none" and is reported as `undefined`/`[]` — never the contract's
       `null`. `heat` is the sole exception: it stays derived, never stored
       (see the header of derive.ts and CHANGELOG), and this source has no
       honest way to compute it, so it reports the capability itself as
       missing with a real `null`, exactly as the contract asks for a field
       that hasn't landed yet. */
    parts: row.parts.map(
      (part): TaskPart => ({ title: part.title, done: part.done })
    ),
    entry: row.entry ?? undefined,
    value: row.valueCents != null ? row.valueCents / 100 : undefined,
    earned: row.earnedCents != null ? row.earnedCents / 100 : undefined,
    heat: null,
    waitsOn: activeWait
      ? { on: activeWait.waitingOnUserId, for: activeWait.reason }
      : undefined,
    movedFrom: row.previousScheduledStart
      ? formatClock(row.previousScheduledStart)
      : undefined,
  };
}
