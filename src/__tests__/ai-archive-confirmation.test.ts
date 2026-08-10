import { NextRequest } from "next/server";

import { POST } from "@/app/api/ai/chat/route";
import { buildAgentPromptForUser } from "@/services/ai/context";
import { getConfiguredSchedulerAI } from "@/services/ai/settings";
import { WorkspaceKind, WorkspaceRole } from "@prisma/client";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";
import { schedulePushTaskBlock } from "@/lib/task-block-push";

jest.mock("@/services/ai/context", () => ({
  buildAgentPromptForUser: jest.fn(),
}));
jest.mock("@/services/ai/settings", () => ({
  getConfiguredSchedulerAI: jest.fn(),
}));
jest.mock("@/lib/auth/api-auth", () => ({
  authenticateRequest: jest.fn(),
}));
jest.mock("@/lib/realtime/publish", () => ({
  publishRealtimeEvent: jest.fn(),
}));
jest.mock("@/lib/task-block-push", () => ({
  schedulePushTaskBlock: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    aiConversation: { create: jest.fn(), update: jest.fn() },
    aiMessage: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    task: { findFirst: jest.fn(), update: jest.fn() },
    scheduledBlock: { deleteMany: jest.fn() },
  },
}));

const taskModel = prisma.task as unknown as {
  findFirst: jest.Mock;
  update: jest.Mock;
};

const workspace = {
  enabled: true,
  workspaceId: "workspace-1",
  workspaceKind: WorkspaceKind.SHARED,
  role: WorkspaceRole.EDITOR,
  dataScope: { mode: "workspace" as const, workspaceId: "workspace-1" },
};

function request(confirmed = false) {
  return new NextRequest("http://localhost/api/ai/chat", {
    method: "POST",
    body: JSON.stringify({ message: "Archive the release task", confirmed }),
  });
}

async function streamItems(response: Response) {
  return (await response.text())
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
}

describe("AI archive confirmation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(authenticateRequest).mockResolvedValue({
      userId: "user-1",
      workspace,
    });
    jest.mocked(buildAgentPromptForUser).mockResolvedValue("system");
    jest.mocked(getConfiguredSchedulerAI).mockResolvedValue({
      settings: {
        allowParseTasks: true,
        allowFullAuto: true,
        soulPreset: "BALANCED",
      },
      ai: {
        selectChatTool: jest.fn().mockResolvedValue({
          name: "delete_task",
          arguments: { taskId: "task-1" },
        }),
      },
      source: "byok",
      usage: { plan: "PRO", allowed: true },
    } as never);
    (prisma.aiConversation.create as jest.Mock).mockResolvedValue({
      id: "conversation-1",
    });
    (prisma.aiConversation.update as jest.Mock).mockResolvedValue({});
    (prisma.aiMessage.create as jest.Mock).mockResolvedValue({});
    (prisma.aiMessage.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.aiMessage.findFirst as jest.Mock).mockResolvedValue({
      id: "confirmation-1",
      toolPayload: {
        requestedTool: "delete_task",
        arguments: { taskId: "task-1" },
      },
    });
    (prisma.aiMessage.update as jest.Mock).mockResolvedValue({});
    taskModel.findFirst.mockResolvedValue({
      id: "task-1",
      title: "Ship release",
      workspaceId: "workspace-1",
      assigneeId: "user-1",
    });
    taskModel.update.mockResolvedValue({});
    (prisma.scheduledBlock.deleteMany as jest.Mock).mockResolvedValue({
      count: 1,
    });
  });

  it("names the exact task before changing it", async () => {
    const items = await streamItems((await POST(request()))!);

    expect(items[0]).toEqual(
      expect.objectContaining({
        type: "meta",
        requiresConfirm: true,
        toolName: "confirmation_required",
        toolPayload: expect.objectContaining({
          target: { type: "task", id: "task-1", title: "Ship release" },
        }),
      })
    );
    expect(taskModel.update).not.toHaveBeenCalled();
  });

  it("archives instead of deleting after confirmation", async () => {
    await streamItems((await POST(request(true)))!);

    expect(taskModel.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "task-1" },
        data: expect.objectContaining({
          isArchived: true,
          archivedAt: expect.any(Date),
        }),
      })
    );
    expect(schedulePushTaskBlock).toHaveBeenCalledWith("user-1", "task-1");
    expect(prisma.aiMessage.update).toHaveBeenCalledWith({
      where: { id: "confirmation-1" },
      data: { requiresConfirm: false },
    });
  });

  it("rejects confirmation replay without a pending server record", async () => {
    (prisma.aiMessage.findFirst as jest.Mock).mockResolvedValue(null);

    const response = (await POST(request(true)))!;

    expect(response.status).toBe(409);
    expect(taskModel.update).not.toHaveBeenCalled();
  });
});
