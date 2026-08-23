import { NextRequest } from "next/server";

import { getRedisConnection } from "@/lib/queue/connection";
import { enforceRateLimits, ipRule } from "@/lib/security/rate-limit";

jest.mock("@/lib/queue/connection", () => ({
  getRedisConnection: jest.fn(),
}));
jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn() },
}));

describe("rate limiter availability", () => {
  const previousSecret = process.env.RATE_LIMIT_HASH_SECRET;

  beforeEach(() => {
    process.env.RATE_LIMIT_HASH_SECRET = "rate-limit-test-secret";
    jest.clearAllMocks();
  });

  afterAll(() => {
    if (previousSecret === undefined) {
      delete process.env.RATE_LIMIT_HASH_SECRET;
    } else {
      process.env.RATE_LIMIT_HASH_SECRET = previousSecret;
    }
  });

  it("fails closed when Redis is unavailable", async () => {
    jest.mocked(getRedisConnection).mockReturnValue({
      eval: jest.fn().mockRejectedValue(new Error("Redis unavailable")),
    } as never);
    const request = new NextRequest("http://localhost/api/ai/chat", {
      headers: { "x-forwarded-for": "203.0.113.10" },
    });

    const response = await enforceRateLimits(
      [ipRule(request, "ai-chat:ip", 60, 60)],
      { route: "/api/ai/chat", userId: "user-1" }
    );

    expect(response?.status).toBe(503);
    expect(response?.headers.get("Retry-After")).toBe("30");
    await expect(response?.json()).resolves.toEqual({
      error: "This action is temporarily unavailable.",
    });
  });
});
