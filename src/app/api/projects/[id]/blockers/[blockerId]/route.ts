import { NextRequest, NextResponse } from "next/server";

import { WorkspaceRole } from "@prisma/client";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { workspaceDataScopeWhere } from "@/lib/auth/workspace-auth";
import { newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "project-blocker-route";
type RouteContext = { params: Promise<{ id: string; blockerId: string }> };

async function findBlocker(
  projectId: string,
  blockerId: string,
  userId: string,
  workspace: Parameters<typeof workspaceDataScopeWhere>[0]
) {
  return prisma.projectBlocker.findFirst({
    where: {
      id: blockerId,
      projectId,
      project: workspaceDataScopeWhere(workspace, userId),
    },
  });
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE, {
      requiredRole: WorkspaceRole.EDITOR,
    });
    if ("response" in auth) return auth.response;

    const { id: projectId, blockerId } = await params;
    const blocker = await findBlocker(
      projectId,
      blockerId,
      auth.userId,
      auth.workspace
    );
    if (!blocker) return new NextResponse("Blocker not found", { status: 404 });

    const body = (await request.json()) as { resolved?: unknown };
    if (typeof body.resolved !== "boolean") {
      return NextResponse.json(
        { error: "resolved must be boolean" },
        { status: 400 }
      );
    }
    const updated = await prisma.projectBlocker.update({
      where: { id: blockerId },
      data: { resolvedAt: body.resolved ? newDate() : null },
    });
    return NextResponse.json(updated);
  } catch (error) {
    logger.error(
      "Failed to update project blocker",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
