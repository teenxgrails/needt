/* Unit tests for the serializer — pure, no database.
 *
 * `NeedtTaskRow` is `Prisma.TaskGetPayload<{ include: taskNeedtInclude }>`, so
 * a hand-built row here is exactly what `prisma.task.findMany` would hand
 * `toNeedtTask` in production. `baseRow` fills every column with a neutral
 * default; each test only overrides what it's testing. */
import {
  SchedulingEnergyLevel,
  SchedulingTaskPriority,
  TaskBusyStatus,
  TaskStage,
} from "@prisma/client";

import { newDateFromYMD } from "@/lib/date-utils";

import { hashTaskId, type NeedtTaskRow, toNeedtTask } from "../task-view";

const NOW = newDateFromYMD(2026, 8, 15); // 15 Sep 2026

const baseRow: NeedtTaskRow = {
  id: "task_1",
  title: "Draft the launch brief",
  description: null,
  status: "todo",

  dueDate: null,
  startDate: null,
  duration: null,
  priority: null,
  energyLevel: null,
  preferredTime: null,

  energyRequired: SchedulingEnergyLevel.MEDIUM,
  estimatedMinutes: null,
  estOptimistic: null,
  estLikely: null,
  estPessimistic: null,
  actualMinutes: null,
  actualFocusedMinutes: 0,
  estimateDelta: null,
  optimisticDelta: null,
  likelyDelta: null,
  pessimisticDelta: null,
  minChunkMinutes: null,
  maxChunkMinutes: null,
  deadline: null,
  hardDeadline: false,
  priorityLevel: SchedulingTaskPriority.MEDIUM,
  contextTag: null,
  isFrozen: false,
  dependsOnId: null,
  autoScheduled: false,
  isAutoScheduled: false,
  scheduleLocked: false,
  scheduledStart: null,
  scheduledEnd: null,
  scheduleId: null,
  scheduleScore: null,
  lastScheduled: null,
  availableFrom: null,
  postponedUntil: null,
  isArchived: false,
  archivedAt: null,
  blockEventId: null,
  blockFeedId: null,
  blockDirty: false,
  isRecurring: false,
  recurrenceRule: null,
  lastCompletedDate: null,
  completedAt: null,
  recurrenceMasterId: null,
  recurrenceInstanceAt: null,
  externalTaskId: null,
  source: null,
  lastSyncedAt: null,
  externalListId: null,
  externalCreatedAt: null,
  externalUpdatedAt: null,
  syncStatus: null,
  syncError: null,
  syncHash: null,
  skipSync: false,
  userId: "user_1",
  workspaceId: null,
  assigneeId: null,
  busyStatus: TaskBusyStatus.BUSY,
  stageId: null,
  createdAt: newDateFromYMD(2026, 8, 1),
  updatedAt: newDateFromYMD(2026, 8, 1),
  projectId: null,
  boardId: null,
  boardColumnId: null,
  boardPosition: null,
  properties: null,

  entry: null,
  noSlot: false,
  lastTouchedAt: null,
  previousScheduledStart: null,
  valueCents: null,
  earnedCents: null,
  globalStage: null,

  project: null,
  parts: [],
  waits: [],
  activities: [],
};

function row(overrides: Partial<NeedtTaskRow>): NeedtTaskRow {
  return { ...baseRow, ...overrides };
}

describe("toNeedtTask", () => {
  it("maps title, project name, and the todo/in_progress statuses", () => {
    const t = toNeedtTask(
      row({ title: "Ship it", status: "in_progress", project: { name: "Operations" } }),
      NOW
    );
    expect(t.title).toBe("Ship it");
    expect(t.project).toBe("Operations");
    expect(t.status).toBe("in_progress");
  });

  it("returns project: null, not undefined, when projectId is unset", () => {
    const t = toNeedtTask(row({ project: null }), NOW);
    expect(t.project).toBeNull();
  });

  it("derives done from status === 'completed' and leaves status unset", () => {
    const t = toNeedtTask(row({ status: "completed" }), NOW);
    expect(t.done).toBe(true);
    expect(t.status).toBeUndefined();
  });

  it("formats due from dueDate the same way derive.dateLabel does", () => {
    const t = toNeedtTask(row({ dueDate: newDateFromYMD(2026, 8, 4) }), NOW);
    expect(t.due).toBe("4 Sep");
  });

  it("leaves due unset when there is no dueDate", () => {
    const t = toNeedtTask(row({ dueDate: null }), NOW);
    expect(t.due).toBeUndefined();
  });

  it("reads the estimate from estimatedMinutes, not duration", () => {
    const t = toNeedtTask(row({ estimatedMinutes: 90, duration: 45 }), NOW);
    expect(t.est).toBe(90);
  });

  it("reads at and time from scheduledStart's hour and clock, in local time", () => {
    const scheduledStart = new Date(2026, 8, 4, 9, 30);
    const t = toNeedtTask(row({ scheduledStart }), NOW);
    expect(t.at).toBe(9);
    expect(t.time).toBe("09:30");
  });

  it("leaves at, time and noSlot unset for an unscheduled, non-noSlot task", () => {
    const t = toNeedtTask(row({ scheduledStart: null, noSlot: false }), NOW);
    expect(t.at).toBeUndefined();
    expect(t.time).toBeUndefined();
    expect(t.noSlot).toBeUndefined();
  });

  it("reports noSlot: true for a task with no rail", () => {
    const t = toNeedtTask(row({ noSlot: true }), NOW);
    expect(t.noSlot).toBe(true);
  });

  it("formats movedFrom from previousScheduledStart", () => {
    const t = toNeedtTask(
      row({ previousScheduledStart: new Date(2026, 8, 4, 9, 30) }),
      NOW
    );
    expect(t.movedFrom).toBe("09:30");
  });

  it("reads holder from assigneeId", () => {
    const t = toNeedtTask(row({ assigneeId: "anna" }), NOW);
    expect(t.holder).toBe("anna");
  });

  it("maps globalStage to the lowercase NeedtStageId, and unset to undefined", () => {
    expect(toNeedtTask(row({ globalStage: TaskStage.DOING }), NOW).stage).toBe(
      "doing"
    );
    expect(toNeedtTask(row({ globalStage: TaskStage.DONE }), NOW).stage).toBe(
      "done"
    );
    expect(toNeedtTask(row({ globalStage: null }), NOW).stage).toBeUndefined();
  });

  describe("blockedBy — reads Task.dependsOnId, not TaskDependency", () => {
    it("hashes the dependency's cuid the same way it hashes id", () => {
      const t = toNeedtTask(row({ id: "task_a", dependsOnId: "task_b" }), NOW);
      expect(t.id).toBe(hashTaskId("task_a"));
      expect(t.blockedBy).toBe(hashTaskId("task_b"));
      expect(t.blockedBy).not.toBe(t.id);
    });

    it("leaves blockedBy unset with no dependency", () => {
      const t = toNeedtTask(row({ dependsOnId: null }), NOW);
      expect(t.blockedBy).toBeUndefined();
    });
  });

  describe("id hashing", () => {
    it("is deterministic", () => {
      expect(hashTaskId("clx1234567890")).toBe(hashTaskId("clx1234567890"));
    });

    it("is a non-negative integer even for very different strings", () => {
      for (const cuid of ["a", "clx1234567890", "z".repeat(40), ""]) {
        const hash = hashTaskId(cuid);
        expect(Number.isInteger(hash)).toBe(true);
        expect(hash).toBeGreaterThanOrEqual(0);
      }
    });

    it("gives different ids to different cuids (no accidental collision here)", () => {
      const ids = new Set(
        ["task_1", "task_2", "task_3", "task_4", "task_5"].map(hashTaskId)
      );
      expect(ids.size).toBe(5);
    });
  });

  describe("age — the latest TaskActivity wins over updatedAt", () => {
    it("is undefined with no activity and no lastTouchedAt", () => {
      const t = toNeedtTask(row({ activities: [] }), NOW);
      expect(t.age).toBeUndefined();
    });

    it("counts days since the latest activity's createdAt", () => {
      const t = toNeedtTask(
        row({ activities: [{ createdAt: newDateFromYMD(2026, 8, 5) }] }),
        NOW
      );
      expect(t.age).toBe(10); // 15 Sep - 5 Sep
    });

    it("falls back to lastTouchedAt when there is no activity", () => {
      const t = toNeedtTask(
        row({ activities: [], lastTouchedAt: newDateFromYMD(2026, 8, 12) }),
        NOW
      );
      expect(t.age).toBe(3);
    });

    it("prefers the activity over a stale updatedAt (which reschedules rewrite)", () => {
      const t = toNeedtTask(
        row({
          updatedAt: NOW, // a reschedule "just now"
          activities: [{ createdAt: newDateFromYMD(2026, 8, 1) }],
        }),
        NOW
      );
      expect(t.age).toBe(14);
    });
  });

  describe("three-state fields — null only for heat", () => {
    it("heat is always null: the capability is derived-only and not stored", () => {
      expect(toNeedtTask(row({}), NOW).heat).toBeNull();
    });

    it("parts is [] (not null) for a task with no parts, now that the table exists", () => {
      const t = toNeedtTask(row({ parts: [] }), NOW);
      expect(t.parts).toEqual([]);
    });

    it("parts maps title/done and drops position/timestamps", () => {
      const t = toNeedtTask(
        row({
          parts: [
            {
              id: "p1",
              taskId: "task_1",
              title: "Pull last month's numbers",
              done: true,
              position: 0,
              createdAt: NOW,
              updatedAt: NOW,
            },
          ],
        }),
        NOW
      );
      expect(t.parts).toEqual([
        { title: "Pull last month's numbers", done: true },
      ]);
    });

    it("entry is undefined, not null, when the column is unset", () => {
      expect(toNeedtTask(row({ entry: null }), NOW).entry).toBeUndefined();
    });

    it("entry passes through the stored string", () => {
      expect(toNeedtTask(row({ entry: "Open the quote PDF" }), NOW).entry).toBe(
        "Open the quote PDF"
      );
    });

    it("waitsOn is undefined with no unresolved TaskWait row", () => {
      expect(toNeedtTask(row({ waits: [] }), NOW).waitsOn).toBeUndefined();
    });

    it("waitsOn reads the (already-filtered) active wait's person and reason", () => {
      const t = toNeedtTask(
        row({
          waits: [
            {
              id: "w1",
              taskId: "task_1",
              waitingOnUserId: "anna",
              reason: "the legal sign-off",
              resolvedAt: null,
              createdAt: NOW,
            },
          ],
        }),
        NOW
      );
      expect(t.waitsOn).toEqual({ on: "anna", for: "the legal sign-off" });
    });
  });

  describe("money — integer cents in, major units out, never a Float column", () => {
    it("value and earned are undefined when their *Cents columns are null", () => {
      const t = toNeedtTask(row({ valueCents: null, earnedCents: null }), NOW);
      expect(t.value).toBeUndefined();
      expect(t.earned).toBeUndefined();
    });

    it("divides cents to major units exactly, with no float drift", () => {
      const t = toNeedtTask(
        row({ valueCents: 420000, earnedCents: 380000 }),
        NOW
      );
      expect(t.value).toBe(4200);
      expect(t.earned).toBe(3800);
    });

    it("handles an odd number of cents without rounding away the fraction", () => {
      const t = toNeedtTask(row({ valueCents: 160050 }), NOW);
      expect(t.value).toBeCloseTo(1600.5, 10);
    });

    it("zero cents is a real zero, not treated as absent", () => {
      const t = toNeedtTask(row({ valueCents: 0 }), NOW);
      expect(t.value).toBe(0);
    });
  });
});
