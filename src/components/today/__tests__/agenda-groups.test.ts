import { buildAgendaGroups } from "@/components/today/agenda-groups";

import { newDate } from "@/lib/date-utils";

import { type Task, TaskStatus } from "@/types/task";

function task(overrides: Partial<Task> & Pick<Task, "id" | "status">): Task {
  return {
    title: overrides.id,
    tagIds: [],
    isRecurring: false,
    isAutoScheduled: false,
    scheduleLocked: false,
    ...overrides,
  } as Task;
}

describe("buildAgendaGroups", () => {
  const dayStart = newDate("2026-08-08T00:00:00.000Z");
  const dayEnd = newDate("2026-08-08T23:59:59.999Z");

  it("retains tasks completed on or assigned to a historical day", () => {
    const groups = buildAgendaGroups({
      tasks: [
        task({
          id: "completed-that-day",
          status: TaskStatus.COMPLETED,
          completedAt: newDate("2026-08-08T14:00:00.000Z"),
        }),
        task({
          id: "scheduled-that-day",
          status: TaskStatus.COMPLETED,
          completedAt: newDate("2026-08-09T14:00:00.000Z"),
          dueDate: newDate("2026-08-08T12:00:00.000Z"),
        }),
        task({
          id: "other-day",
          status: TaskStatus.COMPLETED,
          completedAt: newDate("2026-08-09T14:00:00.000Z"),
        }),
      ],
      dayStart,
      dayEnd,
      viewingToday: false,
      referencedIds: new Set(),
    });

    expect(groups.find((group) => group.id === "completed")?.tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "completed-that-day" }),
        expect.objectContaining({ id: "scheduled-that-day" }),
      ])
    );
    expect(
      groups
        .flatMap((group) => group.tasks)
        .some((candidate) => candidate.id === "other-day")
    ).toBe(false);
  });

  it("excludes explicit references from generated groups without mutating tasks", () => {
    const source = task({
      id: "explicit",
      status: TaskStatus.TODO,
      dueDate: newDate("2026-08-08T12:00:00.000Z"),
    });
    const groups = buildAgendaGroups({
      tasks: [source],
      dayStart,
      dayEnd,
      viewingToday: false,
      referencedIds: new Set([source.id]),
    });

    expect(groups).toEqual([]);
    expect(source.dueDate).toEqual(newDate("2026-08-08T12:00:00.000Z"));
  });
});
