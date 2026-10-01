import { NextRequest } from "next/server";

import { POST } from "@/app/api/ai/chat/route";
import {
  getConfiguredSchedulerAI,
  getPreparedSchedulerAI,
} from "@/services/ai/settings";
import {
  HOSTED_AI_BUSY_MESSAGE,
  HOSTED_AI_RESTING_MESSAGE,
  HostedAiQueueError,
} from "@/services/ai/slow-queue";

import { authenticateRequest } from "@/lib/auth/api-auth";

jest.mock("@/services/ai/settings", () => ({
  getConfiguredSchedulerAI: jest.fn(),
  getPreparedSchedulerAI: jest.fn(),
}));
jest.mock("@/lib/auth/api-auth", () => ({
  authenticateRequest: jest.fn(),
}));
jest.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimits: jest.fn().mockResolvedValue(null),
  ipRule: jest.fn(),
  accountRule: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({ prisma: {} }));

function request() {
  return new NextRequest("http://localhost/api/ai/chat", {
    method: "POST",
    body: JSON.stringify({ message: "Plan my day" }),
  });
}

describe("AI chat soft limit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(authenticateRequest).mockResolvedValue({
      userId: "user-1",
      workspace: {
        workspaceId: "workspace-1",
        role: "OWNER",
      },
    } as never);
    jest.mocked(getConfiguredSchedulerAI).mockResolvedValue({
      settings: {},
      ai: {},
      source: "hosted",
      usage: {
        plan: "PRO",
        allowed: true,
        exhausted: false,
        mode: "slow",
      },
    } as never);
  });

  it("returns the exact no-number resting message at the ceiling", async () => {
    jest.mocked(getPreparedSchedulerAI).mockResolvedValue({
      settings: {},
      ai: {},
      source: "none",
      hostedMode: "blocked",
      usage: {
        plan: "PRO",
        allowed: false,
        exhausted: true,
        mode: "blocked",
      },
    } as never);

    const response = (await POST(request()))!;
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toMatchObject({
      code: "HOSTED_LIMIT_REACHED",
      error: HOSTED_AI_RESTING_MESSAGE,
    });
    expect(payload.error).not.toMatch(/actions? left|used|remaining|of \d+/i);
  });

  it("fails closed with the exact busy message when queueing is unavailable", async () => {
    jest
      .mocked(getPreparedSchedulerAI)
      .mockRejectedValue(new HostedAiQueueError());

    const response = (await POST(request()))!;
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload).toEqual({
      code: "HOSTED_AI_BUSY",
      error: HOSTED_AI_BUSY_MESSAGE,
    });
  });
});
