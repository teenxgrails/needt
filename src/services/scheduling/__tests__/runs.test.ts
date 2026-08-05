import { scheduleAllTasksForUserDetailed } from "@/services/scheduling/TaskSchedulingService";
import { SchedulingRunSource, SchedulingRunStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { executeSchedulingRun } from "../runs";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    task: { findMany: jest.fn() },
    schedulingRun: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock("@/services/scheduling/TaskSchedulingService", () => ({
  scheduleAllTasksForUserDetailed: jest.fn(),
}));
jest.mock("@/lib/task-block-push", () => ({ repushDirtyBlocks: jest.fn() }));
jest.mock("@/services/connectors/webhooks", () => ({
  sendConnectorWebhook: jest.fn(),
}));
jest.mock("@/lib/realtime/publish", () => ({
  publishRealtimeEvent: jest.fn(),
}));

describe("executeSchedulingRun", () => {
  it("persists the engine's exact unscheduled reason codes", async () => {
    const taskFindMany = prisma.task.findMany as jest.Mock;
    const runFindUnique = prisma.schedulingRun.findUnique as jest.Mock;
    const runUpdate = prisma.schedulingRun.update as jest.Mock;
    runFindUnique.mockResolvedValue({
      id: "run-1",
      userId: "user-1",
      source: SchedulingRunSource.MANUAL,
      status: SchedulingRunStatus.QUEUED,
    });
    taskFindMany.mockResolvedValue([]);
    jest.mocked(scheduleAllTasksForUserDetailed).mockResolvedValue({
      tasks: [],
      scheduleResult: {
        blocks: [],
        frozenBlocks: [],
        unscheduled: [
          {
            taskId: "task-1",
            title: "Strict task",
            reason: "HARD_DEADLINE_MISSED",
          },
        ],
      },
    });
    runUpdate.mockImplementation(({ data }) =>
      Promise.resolve({ id: "run-1", userId: "user-1", ...data })
    );

    await executeSchedulingRun("run-1");

    expect(runUpdate).toHaveBeenLastCalledWith({
      where: { id: "run-1" },
      data: expect.objectContaining({
        status: SchedulingRunStatus.SUCCEEDED,
        unscheduled: [{ taskId: "task-1", reason: "HARD_DEADLINE_MISSED" }],
      }),
    });
    expect(taskFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          assigneeId: "user-1",
          isArchived: false,
          AND: [
            {
              OR: [
                { projectId: null },
                { project: { is: { status: "active" } } },
              ],
            },
          ],
        }),
      })
    );
  });
});
