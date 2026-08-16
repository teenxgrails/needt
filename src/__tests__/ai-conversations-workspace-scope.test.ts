import { NextRequest } from "next/server";
import { WorkspaceKind, WorkspaceRole } from "@prisma/client";

import * as route from "@/app/api/ai/conversations/route";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/auth/api-auth", () => ({
  authenticateRequest: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    aiConversation: { create: jest.fn(), findMany: jest.fn() },
  },
}));

const conversations = prisma.aiConversation as unknown as {
  create: jest.Mock;
  findMany: jest.Mock;
};

const workspace = {
  enabled: true,
  workspaceId: "workspace-1",
  workspaceKind: WorkspaceKind.PERSONAL,
  role: WorkspaceRole.OWNER,
  dataScope: { mode: "workspace" as const, workspaceId: "workspace-1" },
};

describe("AI conversations workspace scope", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(authenticateRequest).mockResolvedValue({
      userId: "user-1",
      workspace,
    });
  });

  it("lists conversations only from the authenticated workspace", async () => {
    conversations.findMany.mockResolvedValue([]);

    const response = await route.GET(
      new NextRequest("http://localhost/api/ai/conversations")
    );
    if (!response) throw new Error("Expected a response");

    expect(conversations.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", workspaceId: "workspace-1" },
      })
    );
    expect(response.status).toBe(200);
  });

  it("creates conversations in the authenticated workspace", async () => {
    conversations.create.mockResolvedValue({ id: "conversation-1" });

    const response = await route.POST(
      new NextRequest("http://localhost/api/ai/conversations", {
        method: "POST",
        body: JSON.stringify({ title: "Release planning" }),
      })
    );
    if (!response) throw new Error("Expected a response");

    expect(conversations.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          userId: "user-1",
          workspaceId: "workspace-1",
          title: "Release planning",
        },
      })
    );
    expect(response.status).toBe(200);
  });
});
