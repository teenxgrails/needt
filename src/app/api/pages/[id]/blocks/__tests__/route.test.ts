import { NextRequest } from "next/server";

import { PUT } from "@/app/api/pages/[id]/blocks/route";
import {
  PageCollaborationActiveError,
  writePageBlocks,
} from "@/services/pages/page-write-path";
import { PageBlockType } from "@prisma/client";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { resolvePageAccess } from "@/lib/auth/page-auth";
import { prisma } from "@/lib/prisma";
import {
  claimOfflineMutation,
  failOfflineMutation,
  replayOfflineMutation,
} from "@/lib/pwa/offline-mutation";

jest.mock("@/lib/auth/api-auth", () => ({ authenticateRequest: jest.fn() }));
jest.mock("@/lib/auth/page-auth", () => ({ resolvePageAccess: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: { page: { findFirst: jest.fn() } },
}));
jest.mock("@/lib/pwa/offline-mutation", () => ({
  claimOfflineMutation: jest.fn(),
  completeOfflineMutation: jest.fn(),
  failOfflineMutation: jest.fn(),
  replayOfflineMutation: jest.fn(),
}));
jest.mock("@/services/pages/page-write-path", () => {
  const actual = jest.requireActual("@/services/pages/page-write-path");
  return { ...actual, writePageBlocks: jest.fn() };
});

const authenticate = authenticateRequest as jest.Mock;
const resolveAccess = resolvePageAccess as jest.Mock;
const findPage = prisma.page.findFirst as jest.Mock;
const claimMutation = claimOfflineMutation as jest.Mock;
const failMutation = failOfflineMutation as jest.Mock;
const replayMutation = replayOfflineMutation as jest.Mock;
const saveBlocks = writePageBlocks as jest.Mock;

describe("PUT /api/pages/:id/blocks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authenticate.mockResolvedValue({
      userId: "user-1",
      workspace: { workspaceId: "workspace-1" },
    });
    resolveAccess.mockResolvedValue(true);
    findPage.mockResolvedValue({
      contentRevision: 8,
      updatedAt: new Date("2026-09-26T08:00:00.000Z"),
    });
    replayMutation.mockResolvedValue(null);
    claimMutation.mockResolvedValue({ recordId: "mutation-1" });
  });

  it("returns a repairable conflict and fails the offline claim during live editing", async () => {
    saveBlocks.mockRejectedValue(new PageCollaborationActiveError());
    const request = new NextRequest(
      "http://localhost/api/pages/page-1/blocks",
      {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          "if-match": "7",
          "x-idempotency-key": "mutation-1",
        },
        body: JSON.stringify({
          blocks: [
            {
              id: "block-1",
              type: PageBlockType.PARAGRAPH,
              content: { text: "stale" },
              position: 1024,
            },
          ],
        }),
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ id: "page-1" }),
    });
    if (!response) throw new Error("Expected a route response");

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: "PAGE_COLLABORATION_ACTIVE",
        repairable: true,
      })
    );
    expect(failMutation).toHaveBeenCalledWith("mutation-1");
    expect(saveBlocks.mock.calls[0][5]).toBe(7);
  });
});
