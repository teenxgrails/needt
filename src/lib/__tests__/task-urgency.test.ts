import {
  getTaskUrgency,
  isTodayTask,
  sortByUrgency,
} from "@/lib/task-urgency";

import { Task, TaskStatus } from "@/types/task";

const thresholds = { redThresholdHours: 2, yellowThresholdHours: 24 };
const now = new Date("2026-07-11T12:00:00.000Z");

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: Math.random().toString(36).slice(2),
    title: "Task",
    status: TaskStatus.TODO,
    tags: [],
    createdAt: now,
    updatedAt: now,
    isRecurring: false,
    isAutoScheduled: false,
    scheduleLocked: false,
    ...overrides,
  } as Task;
}

describe("getTaskUrgency", () => {
  it("marks overdue and soon-due tasks red", () => {
    const overdue = makeTask({ dueDate: new Date("2026-07-11T09:00:00.000Z") });
    const soon = makeTask({ dueDate: new Date("2026-07-11T13:00:00.000Z") });
    expect(getTaskUrgency(overdue, thresholds, now)).toBe("red");
    expect(getTaskUrgency(soon, thresholds, now)).toBe("red");
  });

  it("marks tasks within the yellow window yellow", () => {
    const later = makeTask({ dueDate: new Date("2026-07-11T20:00:00.000Z") });
    expect(getTaskUrgency(later, thresholds, now)).toBe("yellow");
  });

  it("marks distant tasks green", () => {
    const distant = makeTask({ dueDate: new Date("2026-07-13T12:00:00.000Z") });
    expect(getTaskUrgency(distant, thresholds, now)).toBe("green");
  });

  it("returns none when there is no due date", () => {
    expect(getTaskUrgency(makeTask({ dueDate: null }), thresholds, now)).toBe(
      "none"
    );
  });
});

describe("isTodayTask", () => {
  it("includes overdue and due-today tasks but excludes completed ones", () => {
    const dueToday = makeTask({ dueDate: new Date("2026-07-11T18:00:00.000Z") });
    const completed = makeTask({
      dueDate: new Date("2026-07-11T18:00:00.000Z"),
      status: TaskStatus.COMPLETED,
    });
    const tomorrow = makeTask({ dueDate: new Date("2026-07-12T18:00:00.000Z") });
    expect(isTodayTask(dueToday, now)).toBe(true);
    expect(isTodayTask(completed, now)).toBe(false);
    // A task due tomorrow is not part of today's list.
    expect(isTodayTask(tomorrow, now)).toBe(false);
  });
});

describe("sortByUrgency", () => {
  it("pins the most urgent tasks to the top", () => {
    const green = makeTask({
      title: "green",
      dueDate: new Date("2026-07-13T12:00:00.000Z"),
    });
    const red = makeTask({
      title: "red",
      dueDate: new Date("2026-07-11T09:00:00.000Z"),
    });
    const yellow = makeTask({
      title: "yellow",
      dueDate: new Date("2026-07-11T20:00:00.000Z"),
    });
    const sorted = sortByUrgency([green, yellow, red], thresholds, now);
    expect(sorted.map((task) => task.title)).toEqual(["red", "yellow", "green"]);
  });
});
