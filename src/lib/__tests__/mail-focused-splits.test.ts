import { listMailMessages } from "@/lib/mail-db";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    mailFocusedSplit: { findFirst: jest.fn() },
    mailMessage: { findMany: jest.fn() },
  },
}));

const focusedSplitModel = prisma.mailFocusedSplit as unknown as {
  findFirst: jest.Mock;
};
const messageModel = prisma.mailMessage as unknown as {
  findMany: jest.Mock;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("focused Mail split queries", () => {
  it("does not fall back to the inbox when the split belongs to another user", async () => {
    focusedSplitModel.findFirst.mockResolvedValue(null);

    await expect(
      listMailMessages({ userId: "user-1", focusedSplitId: "split-other" })
    ).resolves.toEqual([]);

    expect(focusedSplitModel.findFirst).toHaveBeenCalledWith({
      where: { id: "split-other", userId: "user-1" },
      select: { senderAddress: true },
    });
    expect(messageModel.findMany).not.toHaveBeenCalled();
  });

  it("filters focused messages through the authenticated user's Mail accounts", async () => {
    focusedSplitModel.findFirst.mockResolvedValue({
      senderAddress: "billing@example.com",
    });
    messageModel.findMany.mockResolvedValue([]);

    await listMailMessages({ userId: "user-1", focusedSplitId: "split-1" });

    expect(messageModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          account: { userId: "user-1" },
          fromAddress: "billing@example.com",
        }),
      })
    );
  });
});
