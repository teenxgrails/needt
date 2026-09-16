import { prisma } from "@/lib/prisma";

import { recordHostedAiTokens } from "../usage";

jest.mock("@/lib/entitlements", () => ({ getPlan: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: { aiUsage: { findUnique: jest.fn(), upsert: jest.fn() } },
}));

const aiUsage = prisma.aiUsage as unknown as {
  upsert: jest.Mock;
};

describe("hosted AI token metering", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("atomically adds normalized provider token counts", async () => {
    aiUsage.upsert.mockResolvedValue({});

    await recordHostedAiTokens("user-1", {
      inputTokens: 12.8,
      outputTokens: -2,
    });

    expect(aiUsage.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          userId: "user-1",
          inputTokens: 12,
          outputTokens: 0,
        }),
        update: {
          inputTokens: { increment: 12 },
          outputTokens: { increment: 0 },
        },
      })
    );
  });

  it("does not create an empty metering row", async () => {
    await recordHostedAiTokens("user-1", {
      inputTokens: Number.NaN,
      outputTokens: 0,
    });

    expect(aiUsage.upsert).not.toHaveBeenCalled();
  });
});
