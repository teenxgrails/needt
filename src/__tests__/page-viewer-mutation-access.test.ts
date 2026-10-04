import { NextRequest } from "next/server";

import * as commentRoute from "@/app/api/page-comments/[id]/route";
import * as templateRoute from "@/app/api/page-templates/route";
import * as proposalRoute from "@/app/api/pages/[id]/meeting-proposals/[proposalId]/route";
import { decideMeetingNoteProposal } from "@/services/pages/meeting-note-proposals";
import { PageAccessRole, WorkspaceRole } from "@prisma/client";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { resolvePageAccess } from "@/lib/auth/page-auth";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/auth/api-auth");
jest.mock("@/lib/auth/page-auth", () => ({
  pageVisibilityWhere: jest.fn(),
  resolvePageAccess: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    pageComment: {
      findFirst: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    page: { findFirst: jest.fn() },
    pageTemplate: { upsert: jest.fn() },
  },
}));
jest.mock("@/services/pages/meeting-note-proposals", () => ({
  decideMeetingNoteProposal: jest.fn(),
}));

const commentModel = prisma.pageComment as unknown as {
  findFirst: jest.Mock;
  update: jest.Mock;
  deleteMany: jest.Mock;
};
const pageModel = prisma.page as unknown as { findFirst: jest.Mock };

describe("Page Viewer mutation access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(authenticateRequest).mockResolvedValue({
      userId: "user-1",
      workspace: {
        enabled: true,
        workspaceId: "workspace-1",
        workspaceKind: "SHARED",
        role: WorkspaceRole.VIEWER,
        dataScope: { mode: "workspace", workspaceId: "workspace-1" },
      },
    });
    jest.mocked(resolvePageAccess).mockResolvedValue(null);
    commentModel.findFirst.mockResolvedValue({
      id: "comment-1",
      pageId: "page-1",
    });
  });

  it.each(["PATCH", "DELETE"] as const)(
    "rejects %s of an owned comment after Page access becomes read-only",
    async (method) => {
      const request = new NextRequest(
        "http://localhost/api/page-comments/comment-1",
        method === "PATCH"
          ? { method, body: JSON.stringify({ body: "Changed" }) }
          : { method }
      );
      const response = await commentRoute[method](request, {
        params: Promise.resolve({ id: "comment-1" }),
      });

      expect(response!.status).toBe(403);
      expect(resolvePageAccess).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user-1" }),
        "page-1",
        PageAccessRole.EDITOR
      );
      expect(commentModel.update).not.toHaveBeenCalled();
      expect(commentModel.deleteMany).not.toHaveBeenCalled();
    }
  );

  it("requires workspace and Page Editor access to reject a proposal", async () => {
    const request = new NextRequest(
      "http://localhost/api/pages/page-1/meeting-proposals/proposal-1",
      { method: "PATCH", body: JSON.stringify({ decision: "reject" }) }
    );
    const response = await proposalRoute.PATCH(request, {
      params: Promise.resolve({ id: "page-1", proposalId: "proposal-1" }),
    });

    expect(authenticateRequest).toHaveBeenCalledWith(
      request,
      "MeetingNoteProposalAPI",
      { requiredRole: WorkspaceRole.EDITOR }
    );
    expect(response!.status).toBe(403);
    expect(resolvePageAccess).toHaveBeenCalledWith(
      expect.any(Object),
      "page-1",
      PageAccessRole.EDITOR
    );
    expect(decideMeetingNoteProposal).not.toHaveBeenCalled();
  });

  it("does not let a Viewer copy a shared Page into a personal template", async () => {
    const request = new NextRequest("http://localhost/api/page-templates", {
      method: "POST",
      body: JSON.stringify({ name: "Snapshot", pageId: "page-1" }),
    });
    const response = await templateRoute.POST(request);

    expect(response!.status).toBe(403);
    expect(resolvePageAccess).toHaveBeenCalledWith(
      expect.any(Object),
      "page-1",
      PageAccessRole.EDITOR
    );
    expect(pageModel.findFirst).not.toHaveBeenCalled();
  });
});
