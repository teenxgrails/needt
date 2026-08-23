import { NextRequest } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";
import { TaskSyncManager } from "@/lib/task-sync/task-sync-manager";
import { POST } from "@/app/api/task-sync/providers/route";
import { GET as GET_PROVIDER_LISTS } from "@/app/api/task-sync/providers/[id]/lists/route";

jest.mock("@/lib/auth/api-auth", () => ({
  authenticateRequest: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    taskProvider: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    taskListMapping: {
      update: jest.fn().mockResolvedValue({}),
    },
    connectedAccount: {
      findUnique: jest.fn(),
    },
    project: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock("@/lib/task-block-push", () => ({
  schedulePushTaskBlock: jest.fn(),
}));

jest.mock("@/lib/task-sync/providers/google-provider", () => ({
  getGoogleTasksClient: jest.fn(),
  GoogleTaskProvider: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const findProvider = prisma.taskProvider.findUnique as jest.Mock;
const createProvider = prisma.taskProvider.create as jest.Mock;
const updateMapping = prisma.taskListMapping.update as jest.Mock;
const findAccount = prisma.connectedAccount.findUnique as jest.Mock;

describe("deferred Google Tasks sync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(authenticateRequest).mockResolvedValue({ userId: "user-1" });
    updateMapping.mockResolvedValue({});
  });

  it("fails before loading the Google Tasks client with an actionable error", async () => {
    findProvider.mockResolvedValue({
      id: "provider-1",
      type: "GOOGLE",
      userId: "user-1",
      accountId: "account-1",
      account: { id: "account-1", userId: "user-1", provider: "GOOGLE" },
    });

    await expect(
      new TaskSyncManager().getProvider("provider-1")
    ).rejects.toThrow("Google Tasks not connected");
  });

  it("rejects creation of a Google task provider before account or database access", async () => {
    const response = (await POST(
      new NextRequest("http://localhost/api/task-sync/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Google Tasks",
          type: "GOOGLE",
          accountId: "account-1",
        }),
      })
    ))!;

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Google Tasks sync is temporarily unavailable.",
    });
    expect(findAccount).not.toHaveBeenCalled();
    expect(createProvider).not.toHaveBeenCalled();
  });

  it("rejects list access for a legacy Google task provider", async () => {
    findProvider.mockResolvedValue({
      id: "provider-1",
      type: "GOOGLE",
      userId: "user-1",
      accountId: "account-1",
      account: { id: "account-1", userId: "user-1", provider: "GOOGLE" },
    });

    const response = (await GET_PROVIDER_LISTS(
      new NextRequest(
        "http://localhost/api/task-sync/providers/provider-1/lists"
      ),
      { params: Promise.resolve({ id: "provider-1" }) }
    ))!;

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Google Tasks sync is temporarily unavailable.",
    });
  });

  it("persists the disabled Google sync failure on the mapping", async () => {
    findProvider.mockResolvedValue({
      id: "provider-1",
      type: "GOOGLE",
      userId: "user-1",
      accountId: "account-1",
      account: { id: "account-1", userId: "user-1", provider: "GOOGLE" },
    });

    await expect(
      new TaskSyncManager().syncTaskList({
        id: "mapping-1",
        providerId: "provider-1",
        projectId: "project-1",
        externalListId: "google-list-1",
        externalListName: "Google Tasks",
        provider: {
          id: "provider-1",
          type: "GOOGLE",
          userId: "user-1",
        },
      } as never)
    ).rejects.toThrow("Google Tasks not connected");

    expect(updateMapping).toHaveBeenLastCalledWith({
      where: { id: "mapping-1" },
      data: {
        syncStatus: "ERROR",
        lastError:
          "Google Tasks not connected. Google Tasks sync is temporarily unavailable.",
      },
    });
  });
});
