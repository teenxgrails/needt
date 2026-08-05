import { NextRequest } from "next/server";

import * as projectRoute from "@/app/api/projects/[id]/route";
import * as projectsRoute from "@/app/api/projects/route";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/auth/api-auth");
jest.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const projectModel = prisma.project as unknown as {
  create: jest.Mock;
  findFirst: jest.Mock;
  findMany: jest.Mock;
  update: jest.Mock;
};

const workspaceAccess = {
  enabled: true,
  workspaceId: "workspace-1",
  workspaceKind: "SHARED" as const,
  role: "EDITOR" as const,
  dataScope: { mode: "workspace" as const, workspaceId: "workspace-1" },
};

describe("projects API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(authenticateRequest).mockResolvedValue({
      userId: "user-1",
      workspace: workspaceAccess,
    });
  });

  it("scopes reads to the active workspace and derives progress", async () => {
    projectModel.findMany.mockResolvedValue([
      {
        id: "project-1",
        name: "Launch",
        progress: 99,
        tasks: [
          { status: "completed", isArchived: false },
          { status: "todo", isArchived: false },
        ],
        stages: [],
        blockers: [{ id: "blocker-1" }],
      },
    ]);

    const response = await projectsRoute.GET(
      new NextRequest("http://localhost/api/projects")
    );
    expect(projectModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ workspaceId: "workspace-1" }),
      })
    );
    const body = await response!.json();
    expect(body[0]).toEqual(
      expect.objectContaining({
        progress: 50,
        completed: 1,
        total: 2,
        blockerCount: 1,
      })
    );
  });

  it("creates projects in the authorized workspace", async () => {
    projectModel.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: "project-1", ...data })
    );
    const response = await projectsRoute.POST(
      new NextRequest("http://localhost/api/projects", {
        method: "POST",
        body: JSON.stringify({ name: "Launch" }),
      })
    );

    expect(response!.status).toBe(201);
    expect(authenticateRequest).toHaveBeenCalledWith(
      expect.any(NextRequest),
      "projects-route",
      { requiredRole: "EDITOR" }
    );
    expect(projectModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          workspaceId: "workspace-1",
        }),
      })
    );
  });

  it("returns derived progress after a legacy-compatible update", async () => {
    projectModel.findFirst.mockResolvedValue({
      id: "project-1",
      startDate: null,
      deadline: null,
    });
    projectModel.update.mockResolvedValue({
      id: "project-1",
      name: "Launch",
      progress: 80,
      tasks: [
        { status: "completed", isArchived: false },
        { status: "completed", isArchived: false },
        { status: "todo", isArchived: false },
      ],
    });

    const response = await projectRoute.PUT(
      new NextRequest("http://localhost/api/projects/project-1", {
        method: "PUT",
        body: JSON.stringify({ progress: 80 }),
      }),
      { params: Promise.resolve({ id: "project-1" }) }
    );
    expect((await response!.json()).progress).toBe(67);
  });
});
