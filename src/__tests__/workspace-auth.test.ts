import { readFileSync } from "node:fs";

import { WorkspaceKind, WorkspaceRole } from "@prisma/client";
import { NextRequest } from "next/server";

import { isFeatureEnabled } from "@/lib/feature-flags";
import { prisma } from "@/lib/prisma";
import {
  requestedWorkspaceId,
  resolveWorkspaceAccess,
  WorkspaceAuthorizationError,
} from "@/lib/auth/workspace-auth";

jest.mock("@/lib/feature-flags", () => ({
  isFeatureEnabled: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    workspace: { upsert: jest.fn() },
    workspaceMember: { upsert: jest.fn(), findUnique: jest.fn() },
  },
}));

const workspaceModel = prisma.workspace as unknown as {
  upsert: jest.Mock;
};
const memberModel = prisma.workspaceMember as unknown as {
  upsert: jest.Mock;
  findUnique: jest.Mock;
};

describe("workspace authorization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    workspaceModel.upsert.mockResolvedValue({
      id: "personal-1",
      kind: WorkspaceKind.PERSONAL,
    });
    memberModel.upsert.mockResolvedValue({ role: WorkspaceRole.OWNER });
    jest.mocked(isFeatureEnabled).mockResolvedValue(false);
  });

  it("keeps legacy user scope while the flag is disabled", async () => {
    const access = await resolveWorkspaceAccess({
      userId: "user-1",
      requestedWorkspaceId: "untrusted-workspace",
    });

    expect(access).toEqual(
      expect.objectContaining({
        enabled: false,
        workspaceId: "personal-1",
        role: WorkspaceRole.OWNER,
        dataScope: { mode: "legacy", userId: "user-1" },
      })
    );
    expect(memberModel.findUnique).not.toHaveBeenCalled();
  });

  it("defaults enabled users to their personal workspace", async () => {
    jest.mocked(isFeatureEnabled).mockResolvedValue(true);

    const access = await resolveWorkspaceAccess({ userId: "user-1" });

    expect(access.dataScope).toEqual({
      mode: "workspace",
      workspaceId: "personal-1",
    });
    expect(memberModel.findUnique).not.toHaveBeenCalled();
  });

  it("resolves shared access only through the user membership key", async () => {
    jest.mocked(isFeatureEnabled).mockResolvedValue(true);
    memberModel.findUnique.mockResolvedValue({
      role: WorkspaceRole.EDITOR,
      workspace: { id: "shared-1", kind: WorkspaceKind.SHARED },
    });

    const access = await resolveWorkspaceAccess({
      userId: "user-1",
      requestedWorkspaceId: "shared-1",
      requiredRole: WorkspaceRole.EDITOR,
    });

    expect(memberModel.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          workspaceId_userId: {
            workspaceId: "shared-1",
            userId: "user-1",
          },
        },
      })
    );
    expect(access).toEqual(
      expect.objectContaining({
        workspaceId: "shared-1",
        workspaceKind: WorkspaceKind.SHARED,
        role: WorkspaceRole.EDITOR,
      })
    );
  });

  it("rejects a workspace identifier without membership", async () => {
    jest.mocked(isFeatureEnabled).mockResolvedValue(true);
    memberModel.findUnique.mockResolvedValue(null);

    await expect(
      resolveWorkspaceAccess({
        userId: "user-1",
        requestedWorkspaceId: "shared-1",
      })
    ).rejects.toMatchObject({
      status: 403,
      code: "WORKSPACE_ACCESS_DENIED",
    });
  });

  it("enforces the minimum role on the server", async () => {
    jest.mocked(isFeatureEnabled).mockResolvedValue(true);
    memberModel.findUnique.mockResolvedValue({
      role: WorkspaceRole.VIEWER,
      workspace: { id: "shared-1", kind: WorkspaceKind.SHARED },
    });

    await expect(
      resolveWorkspaceAccess({
        userId: "user-1",
        requestedWorkspaceId: "shared-1",
        requiredRole: WorkspaceRole.EDITOR,
      })
    ).rejects.toBeInstanceOf(WorkspaceAuthorizationError);
  });

  it("rejects conflicting header and query workspace identifiers", () => {
    const request = new NextRequest(
      "http://localhost/api/tasks?workspaceId=query-workspace",
      { headers: { "x-workspace-id": "header-workspace" } }
    );

    expect(() => requestedWorkspaceId(request)).toThrow(
      expect.objectContaining({ code: "INVALID_WORKSPACE_REQUEST" })
    );
  });

  it("is wired into the shared authenticated-route boundary", () => {
    const source = readFileSync("src/lib/auth/api-auth.ts", "utf8");
    expect(source).toContain("resolveWorkspaceAccess({");
    expect(source).toContain("requestedWorkspaceId(request)");
  });
});
