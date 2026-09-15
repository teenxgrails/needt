import { NextRequest, NextResponse } from "next/server";

import { POST } from "@/app/api/logs/batch/route";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { ServerLogger } from "@/lib/logger/server";

const writeBatch = jest.fn();

jest.mock("@/lib/auth/api-auth", () => ({
  authenticateRequest: jest.fn(),
}));
jest.mock("@/lib/logger/server", () => ({
  ServerLogger: jest.fn(),
}));

function request(body: unknown) {
  return new NextRequest("http://localhost/api/logs/batch", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("log batch route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(ServerLogger).mockImplementation(
      () => ({ writeBatch }) as unknown as ServerLogger
    );
    writeBatch.mockResolvedValue({ success: true, count: 1 });
  });

  it("rejects unauthenticated batch persistence before parsing entries", async () => {
    const denied = new NextResponse("Unauthorized", { status: 401 });
    jest.mocked(authenticateRequest).mockResolvedValue({ response: denied });

    const response = await POST(request([{ not: "a log" }]));

    expect(response).toBe(denied);
    expect(writeBatch).not.toHaveBeenCalled();
  });

  it("accepts only bounded, typed entries from an authenticated caller", async () => {
    jest.mocked(authenticateRequest).mockResolvedValue({ userId: "user-1" });

    const response = await POST(
      request([
        {
          id: "client-only-id",
          level: "warn",
          message: "Calendar sync failed",
          metadata: { token: "secret", attempt: 2 },
          source: "calendar-client",
          timestamp: "2026-08-23T00:00:00.000Z",
        },
      ])
    );

    expect(response.status).toBe(200);
    expect(writeBatch).toHaveBeenCalledWith([
      expect.objectContaining({
        level: "warn",
        message: "Calendar sync failed",
        source: "calendar-client",
        timestamp: new Date("2026-08-23T00:00:00.000Z"),
      }),
    ]);
  });

  it("rejects oversized or malformed batches", async () => {
    jest.mocked(authenticateRequest).mockResolvedValue({ userId: "user-1" });

    const response = await POST(
      request(
        Array.from({ length: 21 }, () => ({
          level: "info",
          message: "too many entries",
          timestamp: "2026-08-23T00:00:00.000Z",
        }))
      )
    );

    expect(response.status).toBe(400);
    expect(writeBatch).not.toHaveBeenCalled();
  });
});
