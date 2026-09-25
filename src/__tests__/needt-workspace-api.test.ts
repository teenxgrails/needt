import { NextRequest } from "next/server";

import { GET } from "@/app/api/needt/workspace/route";
import { WorkspaceKind, WorkspaceRole } from "@prisma/client";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { prismaDataSource } from "@/lib/needt/prisma-source";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/auth/api-auth");
jest.mock("@/lib/needt/prisma-source");
jest.mock("@/lib/prisma", () => ({
  prisma: { userSettings: { findUnique: jest.fn() } },
}));

const workspace = {
  enabled: true,
  workspaceId: "workspace-1",
  workspaceKind: WorkspaceKind.SHARED,
  role: WorkspaceRole.EDITOR,
  dataScope: { mode: "workspace" as const, workspaceId: "workspace-1" },
};

describe("Needt Workspace API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(authenticateRequest).mockResolvedValue({
      userId: "user-1",
      workspace,
    });
    jest.mocked(prisma.userSettings.findUnique).mockResolvedValue({
      timeZone: "Europe/Zurich",
    } as never);
  });

  it("reads every workspace registry through the authorized source", async () => {
    const source = {
      getTasks: jest.fn().mockResolvedValue([{ id: "task-1" }]),
      getProjects: jest.fn().mockResolvedValue([{ id: "project-1" }]),
      getPeople: jest.fn().mockResolvedValue([{ id: "user-1" }]),
      getStages: jest.fn().mockResolvedValue([{ id: "todo" }]),
    };
    jest
      .mocked(prismaDataSource)
      .mockReturnValue(
        source as unknown as ReturnType<typeof prismaDataSource>
      );

    const request = new NextRequest("http://localhost/api/needt/workspace", {
      headers: { "x-workspace-id": workspace.workspaceId },
    });
    const response = (await GET(request))!;
    const body = await response.json();

    expect(authenticateRequest).toHaveBeenCalledWith(
      request,
      "NeedtWorkspaceAPI"
    );
    expect(prismaDataSource).toHaveBeenCalledWith(
      "user-1",
      workspace,
      expect.any(Function)
    );
    expect(body).toEqual(
      expect.objectContaining({
        workspaceId: "workspace-1",
        tasks: [{ id: "task-1" }],
        projects: [{ id: "project-1" }],
        people: [{ id: "user-1" }],
        stages: [{ id: "todo" }],
        canEdit: true,
      })
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("marks Viewers read-only without weakening the data scope", async () => {
    const viewerWorkspace = { ...workspace, role: WorkspaceRole.VIEWER };
    jest.mocked(authenticateRequest).mockResolvedValue({
      userId: "user-1",
      workspace: viewerWorkspace,
    });
    jest.mocked(prismaDataSource).mockReturnValue({
      getTasks: jest.fn().mockResolvedValue([]),
      getProjects: jest.fn().mockResolvedValue([]),
      getPeople: jest.fn().mockResolvedValue([]),
      getStages: jest.fn().mockResolvedValue([]),
    } as unknown as ReturnType<typeof prismaDataSource>);

    const response = (await GET(
      new NextRequest("http://localhost/api/needt/workspace")
    ))!;

    expect((await response.json()).canEdit).toBe(false);
    expect(prismaDataSource).toHaveBeenCalledWith(
      "user-1",
      viewerWorkspace,
      expect.any(Function)
    );
  });
});
