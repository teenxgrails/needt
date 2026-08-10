import { NextRequest } from "next/server";

import { IdempotencyStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  claimOfflineMutation,
  completeOfflineMutation,
  failOfflineMutation,
  offlineRevisionConflict,
} from "@/lib/pwa/offline-mutation";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    idempotencyRecord: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe("offline mutation conflict checks", () => {
  const updatedAt = new Date("2026-08-09T12:00:00.000Z");

  it("accepts a replay based on the current revision", () => {
    const request = new NextRequest("http://localhost/api/tasks/task-1", {
      headers: {
        "x-needt-offline-scope": "2:user-1:workspace-1",
        "if-match": updatedAt.toISOString(),
      },
    });

    expect(offlineRevisionConflict(request, updatedAt)).toBeNull();
  });

  it("returns a repairable conflict for stale offline work", async () => {
    const request = new NextRequest("http://localhost/api/tasks/task-1", {
      headers: {
        "x-needt-offline-scope": "2:user-1:workspace-1",
        "if-match": "2026-08-09T11:00:00.000Z",
      },
    });

    const response = offlineRevisionConflict(request, updatedAt);
    expect(response?.status).toBe(409);
    await expect(response?.json()).resolves.toEqual({
      error: "OFFLINE_REVISION_CONFLICT",
      repairable: true,
    });
  });

  it("does not impose revision headers on ordinary online requests", () => {
    const request = new NextRequest("http://localhost/api/tasks/task-1");
    expect(offlineRevisionConflict(request, updatedAt)).toBeNull();
  });

  it("replays a completed mutation without executing it again", async () => {
    jest.mocked(prisma.idempotencyRecord.findUnique).mockResolvedValue({
      id: "command-1",
      userId: "user-1",
      operation: "UPDATE_TASK:workspace-1:task-1",
      key: "retry-1",
      status: IdempotencyStatus.SUCCEEDED,
      result: { status: 202, body: { queued: true, replayed: true } },
      expiresAt: new Date("2026-08-10T12:00:00.000Z"),
      createdAt: updatedAt,
      updatedAt,
    });
    const request = new NextRequest("http://localhost/api/tasks/task-1", {
      headers: { "x-idempotency-key": "retry-1" },
    });

    const claim = await claimOfflineMutation({
      request,
      userId: "user-1",
      operation: "UPDATE_TASK:workspace-1:task-1",
    });

    expect(claim.response?.status).toBe(202);
    await expect(claim.response?.json()).resolves.toEqual({
      queued: true,
      replayed: true,
    });
    expect(prisma.idempotencyRecord.create).not.toHaveBeenCalled();
  });

  it("stores only a compact replay acknowledgement", async () => {
    await completeOfflineMutation("command-1");

    expect(prisma.idempotencyRecord.update).toHaveBeenCalledWith({
      where: { id: "command-1" },
      data: {
        status: IdempotencyStatus.SUCCEEDED,
        result: {
          status: 202,
          body: { queued: true, replayed: true },
        },
      },
    });
  });

  it("releases a failed claim so the queued mutation can retry", async () => {
    await failOfflineMutation("command-1");

    expect(prisma.idempotencyRecord.deleteMany).toHaveBeenCalledWith({
      where: {
        id: "command-1",
        status: IdempotencyStatus.IN_PROGRESS,
      },
    });
  });
});
