import { NextRequest } from "next/server";

import * as instantiateRoute from "@/app/api/project-templates/[id]/instantiate/route";
import * as blockerRoute from "@/app/api/projects/[id]/blockers/route";
import * as stageRoute from "@/app/api/projects/[id]/stages/route";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/auth/api-auth");
jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
    project: { findFirst: jest.fn() },
    projectStage: {
      aggregate: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    projectBlocker: { create: jest.fn(), findMany: jest.fn() },
    projectTemplate: { findFirst: jest.fn() },
    task: { count: jest.fn() },
    workspaceMember: { count: jest.fn() },
  },
}));

const workspaceAccess = {
  enabled: true,
  workspaceId: "workspace-1",
  workspaceKind: "SHARED" as const,
  role: "EDITOR" as const,
  dataScope: { mode: "workspace" as const, workspaceId: "workspace-1" },
};

describe("project stages, blockers, and templates API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(authenticateRequest).mockResolvedValue({
      userId: "user-1",
      workspace: workspaceAccess,
    });
    (prisma.project.findFirst as jest.Mock).mockResolvedValue({
      id: "project-1",
    });
  });

  it("creates a stage only after a workspace-scoped project lookup", async () => {
    (prisma.projectStage.aggregate as jest.Mock).mockResolvedValue({
      _max: { position: 1 },
    });
    (prisma.projectStage.create as jest.Mock).mockResolvedValue({
      id: "stage-1",
      projectId: "project-1",
      name: "Review",
      position: 2,
    });

    const response = await stageRoute.POST(
      new NextRequest("http://localhost/api/projects/project-1/stages", {
        method: "POST",
        body: JSON.stringify({ name: "Review" }),
      }),
      { params: Promise.resolve({ id: "project-1" }) }
    );

    expect(response!.status).toBe(201);
    expect(prisma.project.findFirst).toHaveBeenCalledWith({
      where: {
        id: "project-1",
        status: "active",
        workspaceId: "workspace-1",
      },
      select: { id: true },
    });
    expect(prisma.projectStage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ projectId: "project-1", position: 2 }),
      })
    );
  });

  it("rejects blocker tasks from outside the project", async () => {
    (prisma.task.count as jest.Mock).mockResolvedValue(1);

    const response = await blockerRoute.POST(
      new NextRequest("http://localhost/api/projects/project-1/blockers", {
        method: "POST",
        body: JSON.stringify({
          taskId: "target",
          blockerTaskId: "outside-project",
        }),
      }),
      { params: Promise.resolve({ id: "project-1" }) }
    );

    expect(response!.status).toBe(400);
    expect(prisma.projectBlocker.create).not.toHaveBeenCalled();
  });

  it("rejects placeholder mappings to non-members", async () => {
    (prisma.projectTemplate.findFirst as jest.Mock).mockResolvedValue({
      id: "template-1",
      name: "Launch",
      description: null,
      color: null,
      icon: null,
      stages: [],
      tasks: [],
      dependencies: [],
      roles: [{ id: "designer" }],
    });
    (prisma.workspaceMember.count as jest.Mock).mockResolvedValue(0);

    const response = await instantiateRoute.POST(
      new NextRequest(
        "http://localhost/api/project-templates/template-1/instantiate",
        {
          method: "POST",
          body: JSON.stringify({
            roleAssignments: { designer: "outside-user" },
          }),
        }
      ),
      { params: Promise.resolve({ id: "template-1" }) }
    );

    expect(response!.status).toBe(400);
    expect(prisma.projectTemplate.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "template-1", workspaceId: "workspace-1" },
      })
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
