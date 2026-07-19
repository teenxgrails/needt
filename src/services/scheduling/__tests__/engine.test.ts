import {
  CalendarBusyBlock,
  EnergyProfile,
  SchedulableTask,
  SchedulingPreferences,
  scheduleTasks,
} from "../engine";

const mondayMorning = new Date(2026, 6, 6, 8, 0, 0);

const prefs: SchedulingPreferences = {
  workHours: {
    "1": { start: "09:00", end: "17:00" },
  },
  bufferMinutes: 0,
  maxDeepWorkPerDay: 240,
  minBreakMinutes: 0,
  autoRescheduleOnMiss: true,
  enableBodyDoubling: false,
  enableTaskBatching: true,
  hardStopTime: "17:00",
  bufferMultiplier: 1,
};

const energyProfile: EnergyProfile = {
  windows: [
    {
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "12:00",
      energyLevel: "HIGH",
    },
    {
      dayOfWeek: 1,
      startTime: "13:00",
      endTime: "17:00",
      energyLevel: "LOW",
    },
  ],
};

function task(overrides: Partial<SchedulableTask>): SchedulableTask {
  return {
    id: "task",
    title: "Task",
    status: "todo",
    createdAt: new Date("2026-07-01T08:00:00.000Z"),
    estimatedMinutes: 60,
    priority: "MEDIUM",
    energyRequired: "MEDIUM",
    ...overrides,
  };
}

function busy(overrides: Partial<CalendarBusyBlock>): CalendarBusyBlock {
  return {
    id: "busy",
    title: "Busy",
    start: new Date(2026, 6, 6, 9, 0, 0),
    end: new Date(2026, 6, 6, 10, 0, 0),
    source: "calendar",
    ...overrides,
  };
}

describe("scheduleTasks", () => {
  it("orders nearer deadlines before later deadlines", () => {
    const result = scheduleTasks({
      tasks: [
        task({
          id: "later",
          title: "Later",
          deadline: new Date("2026-07-20T17:00:00.000Z"),
        }),
        task({
          id: "soon",
          title: "Soon",
          deadline: new Date("2026-07-07T17:00:00.000Z"),
        }),
      ],
      busyBlocks: [],
      energyProfile,
      prefs,
      now: mondayMorning,
    });

    expect(result.blocks.map((block) => block.taskId)).toEqual([
      "soon",
      "later",
    ]);
  });

  it("places dependency blockers before dependent tasks", () => {
    const result = scheduleTasks({
      tasks: [
        task({
          id: "dependent",
          title: "Dependent",
          priority: "URGENT",
          dependsOnId: "blocker",
        }),
        task({
          id: "blocker",
          title: "Blocker",
          priority: "LOW",
        }),
      ],
      busyBlocks: [],
      energyProfile,
      prefs,
      now: mondayMorning,
    });

    const blocker = result.blocks.find((block) => block.taskId === "blocker");
    const dependent = result.blocks.find(
      (block) => block.taskId === "dependent"
    );

    expect(blocker).toBeDefined();
    expect(dependent).toBeDefined();
    expect(blocker!.end <= dependent!.start).toBe(true);
  });

  it("prefers high-energy windows for high-focus tasks", () => {
    const result = scheduleTasks({
      tasks: [
        task({
          id: "deep-work",
          title: "Deep Work",
          energyRequired: "HIGH",
        }),
      ],
      busyBlocks: [],
      energyProfile,
      prefs,
      now: mondayMorning,
    });

    expect(result.blocks[0].start.getHours()).toBe(9);
  });

  it("avoids calendar busy blocks", () => {
    const result = scheduleTasks({
      tasks: [task({ id: "write", title: "Write" })],
      busyBlocks: [busy({})],
      energyProfile,
      prefs,
      now: mondayMorning,
    });

    expect(result.blocks[0].start.getHours()).toBe(10);
  });

  it("splits large tasks into bounded chunks", () => {
    const result = scheduleTasks({
      tasks: [
        task({
          id: "big",
          title: "Big",
          estimatedMinutes: 120,
          minChunkMinutes: 30,
          maxChunkMinutes: 45,
        }),
      ],
      busyBlocks: [],
      energyProfile,
      prefs,
      now: mondayMorning,
    });

    expect(result.blocks).toHaveLength(3);
    expect(
      result.blocks.map(
        (block) => (block.end.getTime() - block.start.getTime()) / 60_000
      )
    ).toEqual([45, 45, 30]);
  });

  it("reports overcommitment when tasks do not fit", () => {
    const result = scheduleTasks({
      tasks: [
        task({ id: "one", title: "One", estimatedMinutes: 60 }),
        task({ id: "two", title: "Two", estimatedMinutes: 60 }),
      ],
      busyBlocks: [
        busy({
          id: "future-1",
          start: new Date(2026, 6, 13, 9, 0, 0),
          end: new Date(2026, 6, 13, 10, 0, 0),
        }),
        busy({
          id: "future-2",
          start: new Date(2026, 6, 20, 9, 0, 0),
          end: new Date(2026, 6, 20, 10, 0, 0),
        }),
      ],
      energyProfile,
      prefs: {
        ...prefs,
        workHours: { "1": { start: "09:00", end: "10:00" } },
      },
      now: mondayMorning,
    });

    expect(result.blocks).toHaveLength(1);
    expect(result.unscheduled).toEqual([
      {
        taskId: "two",
        title: "Two",
        reason: "No available work-hours slot",
      },
    ]);
  });

  it("keeps frozen blocks untouched and schedules around them", () => {
    const result = scheduleTasks({
      tasks: [
        task({
          id: "frozen",
          title: "Frozen",
          isFrozen: true,
          scheduledStart: new Date(2026, 6, 6, 9, 0, 0),
          scheduledEnd: new Date(2026, 6, 6, 10, 0, 0),
        }),
        task({ id: "next", title: "Next" }),
      ],
      busyBlocks: [],
      energyProfile,
      prefs,
      now: mondayMorning,
    });

    expect(result.frozenBlocks[0].start.getHours()).toBe(9);
    expect(result.blocks[0].start.getHours()).toBe(10);
  });
});
