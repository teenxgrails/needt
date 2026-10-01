import { getRedisConnection } from "@/lib/queue/connection";

import {
  HOSTED_AI_BUSY_MESSAGE,
  HostedAiQueueError,
  waitForHostedAiSlot,
} from "../slow-queue";

jest.mock("@/lib/queue/connection", () => ({
  getRedisConnection: jest.fn(),
}));

describe("hosted AI slow queue", () => {
  beforeEach(() => {
    process.env.RATE_LIMIT_HASH_SECRET = "test-rate-limit-secret";
    jest.clearAllMocks();
  });

  it("waits for the FIFO slot returned by Redis", async () => {
    const sleep = jest.fn().mockResolvedValue(undefined);
    jest.mocked(getRedisConnection).mockReturnValue({
      eval: jest.fn().mockResolvedValue(1500),
    } as never);

    await waitForHostedAiSlot("user-1", { now: 10_000, sleep });

    expect(sleep).toHaveBeenCalledWith(1500);
  });

  it("fails closed when Redis cannot reserve a short slot", async () => {
    jest.mocked(getRedisConnection).mockReturnValue({
      eval: jest.fn().mockRejectedValue(new Error("redis unavailable")),
    } as never);

    await expect(
      waitForHostedAiSlot("user-1", {
        sleep: jest.fn().mockResolvedValue(undefined),
      })
    ).rejects.toEqual(expect.any(HostedAiQueueError));
    await expect(
      waitForHostedAiSlot("user-1", {
        sleep: jest.fn().mockResolvedValue(undefined),
      })
    ).rejects.toThrow(HOSTED_AI_BUSY_MESSAGE);
  });
});
