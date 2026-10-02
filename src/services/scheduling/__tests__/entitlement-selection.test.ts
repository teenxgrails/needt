import { selectTasksWithinAutoScheduleLimit } from "@/services/scheduling/entitlement-selection";

type Task = { id: string; scheduled: boolean };

describe("auto-scheduling entitlement selection", () => {
  const tasks: Task[] = [
    ...Array.from({ length: 20 }, (_, index) => ({
      id: `scheduled-${index}`,
      scheduled: true,
    })),
    { id: "new-1", scheduled: false },
    { id: "new-2", scheduled: false },
  ];

  it("keeps all tasks eligible while the Pro trial is active", () => {
    expect(
      selectTasksWithinAutoScheduleLimit(
        tasks,
        { limit: null, remaining: null },
        (task) => task.scheduled
      )
    ).toHaveLength(22);
  });

  it("stops rescheduling tasks beyond the Free allowance after expiry", () => {
    const selected = selectTasksWithinAutoScheduleLimit(
      tasks,
      { limit: 15, remaining: 0 },
      (task) => task.scheduled
    );

    expect(selected.map((task) => task.id)).toEqual(
      Array.from({ length: 15 }, (_, index) => `scheduled-${index}`)
    );
    expect(tasks).toHaveLength(22);
  });

  it("does not add new tasks above the cap at the start of a new month", () => {
    const selected = selectTasksWithinAutoScheduleLimit(
      tasks,
      { limit: 15, remaining: 15 },
      (task) => task.scheduled
    );

    expect(selected).toHaveLength(15);
    expect(selected).toEqual(tasks.slice(0, 15));
  });
});
