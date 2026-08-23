import { prisma } from "@/lib/prisma";
import { TaskSyncManager } from "@/lib/task-sync/task-sync-manager";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    taskProvider: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/lib/task-block-push", () => ({
  schedulePushTaskBlock: jest.fn(),
}));

const findProvider = prisma.taskProvider.findUnique as jest.Mock;

describe("deferred Google Tasks sync", () => {
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
});
