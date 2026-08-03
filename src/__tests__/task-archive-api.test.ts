import { NextRequest } from "next/server";

import * as taskRoute from "@/app/api/tasks/[id]/route";
import * as tasksRoute from "@/app/api/tasks/route";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";
import { schedulePushTaskBlock } from "@/lib/task-block-push";

jest.mock("@/lib/auth/api-auth");
jest.mock("@/lib/prisma", () => ({
  prisma: {
    task: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    scheduledBlock: { deleteMany: jest.fn() },
    taskListMapping: { findFirst: jest.fn() },
    workSchedule: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock("@/lib/task-block-push", () => ({
  deleteTaskBlockEvent: jest.fn(),
  schedulePushTaskBlock: jest.fn(),
}));
jest.mock("@/services/connectors/webhooks", () => ({
  sendConnectorWebhook: jest.fn(),
}));
jest.mock("@/services/time-tracking/timeEntries", () => ({
  recomputeTaskActuals: jest.fn(),
}));

const taskModel = prisma.task as unknown as {
  findMany: jest.Mock;
  findUnique: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};
const scheduledBlockModel = prisma.scheduledBlock as unknown as {
  deleteMany: jest.Mock;
};

function storedTask(isArchived: boolean) {
  return {
    id: "task-1",
    userId: "user-1",
    title: "Plan launch",
    status: "todo",
    isArchived,
    isRecurring: false,
    recurrenceRule: null,
    projectId: null,
    tags: [],
  };
}

describe("task archive API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(authenticateRequest).mockResolvedValue({ userId: "user-1" });
  });

  it("excludes archived tasks by default and scopes reads to the user", async () => {
    taskModel.findMany.mockResolvedValue([]);

    await tasksRoute.GET(new NextRequest("http://localhost/api/tasks"));

    expect(taskModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          isArchived: false,
        }),
      })
    );
  });

  it("returns only archived tasks when archived=true", async () => {
    taskModel.findMany.mockResolvedValue([storedTask(true)]);

    await tasksRoute.GET(
      new NextRequest("http://localhost/api/tasks?archived=true")
    );

    expect(taskModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          isArchived: true,
        }),
      })
    );
  });

  it("archives without completing and removes scheduled blocks", async () => {
    taskModel.findUnique.mockResolvedValue(storedTask(false));
    taskModel.update.mockImplementation(({ data }) =>
      Promise.resolve({ ...storedTask(true), ...data })
    );
    scheduledBlockModel.deleteMany.mockResolvedValue({ count: 1 });

    const response = await taskRoute.PUT(
      new NextRequest("http://localhost/api/tasks/task-1", {
        method: "PUT",
        body: JSON.stringify({ isArchived: true }),
      }),
      { params: Promise.resolve({ id: "task-1" }) }
    );

    expect(response!.status).toBe(200);
    expect(taskModel.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "task-1", userId: "user-1" },
        data: expect.objectContaining({
          isArchived: true,
          scheduledStart: null,
          scheduledEnd: null,
          scheduleLocked: false,
          archivedAt: expect.any(Date),
        }),
      })
    );
    expect(taskModel.update.mock.calls[0][0].data.status).toBeUndefined();
    expect(scheduledBlockModel.deleteMany).toHaveBeenCalledWith({
      where: { taskId: "task-1", userId: "user-1" },
    });
    expect(schedulePushTaskBlock).toHaveBeenCalledWith("user-1", "task-1");
  });

  it("restores without changing completion status", async () => {
    taskModel.findUnique.mockResolvedValue(storedTask(true));
    taskModel.update.mockImplementation(({ data }) =>
      Promise.resolve({ ...storedTask(false), ...data })
    );

    await taskRoute.PUT(
      new NextRequest("http://localhost/api/tasks/task-1", {
        method: "PUT",
        body: JSON.stringify({ isArchived: false }),
      }),
      { params: Promise.resolve({ id: "task-1" }) }
    );

    expect(taskModel.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isArchived: false,
          archivedAt: null,
        }),
      })
    );
    expect(taskModel.update.mock.calls[0][0].data.status).toBeUndefined();
    expect(scheduledBlockModel.deleteMany).not.toHaveBeenCalled();
  });

  it("rejects edits to an archived task until it is restored", async () => {
    taskModel.findUnique.mockResolvedValue(storedTask(true));

    const response = await taskRoute.PUT(
      new NextRequest("http://localhost/api/tasks/task-1", {
        method: "PUT",
        body: JSON.stringify({ title: "Changed while archived" }),
      }),
      { params: Promise.resolve({ id: "task-1" }) }
    );

    expect(response!.status).toBe(409);
    expect(taskModel.update).not.toHaveBeenCalled();
  });

  it("turns the legacy delete route into a non-destructive archive", async () => {
    taskModel.findUnique.mockResolvedValue(storedTask(false));
    taskModel.update.mockResolvedValue(storedTask(true));
    scheduledBlockModel.deleteMany.mockResolvedValue({ count: 1 });

    const response = await taskRoute.DELETE(
      new NextRequest("http://localhost/api/tasks/task-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "task-1" }) }
    );

    expect(response!.status).toBe(204);
    expect(taskModel.update).toHaveBeenCalledWith({
      where: { id: "task-1", userId: "user-1" },
      data: expect.objectContaining({
        isArchived: true,
        archivedAt: expect.any(Date),
        scheduledStart: null,
        scheduledEnd: null,
        scheduleLocked: false,
      }),
    });
    expect(taskModel.delete).not.toHaveBeenCalled();
    expect(scheduledBlockModel.deleteMany).toHaveBeenCalledWith({
      where: { taskId: "task-1", userId: "user-1" },
    });
    expect(schedulePushTaskBlock).toHaveBeenCalledWith("user-1", "task-1");
  });
});
