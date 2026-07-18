import { ScheduleSnapshot, diffScheduleSnapshots } from "../reschedule-preview";

describe("reschedule preview staging", () => {
  it("returns only changed placements", () => {
    const before: ScheduleSnapshot = {
      tasks: [
        {
          id: "task",
          title: "Write",
          scheduledStart: null,
          scheduledEnd: null,
          scheduleScore: null,
          lastScheduled: null,
          isAutoScheduled: true,
          autoScheduled: true,
        },
      ],
      blocks: [],
    };
    const after: ScheduleSnapshot = {
      ...before,
      tasks: [
        {
          ...before.tasks[0],
          scheduledStart: "2026-07-18T09:00:00.000Z",
          scheduledEnd: "2026-07-18T10:00:00.000Z",
        },
      ],
    };
    expect(diffScheduleSnapshots(before, after)).toHaveLength(1);
  });
});
