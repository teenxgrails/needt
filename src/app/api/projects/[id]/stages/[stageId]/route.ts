import { NextRequest, NextResponse } from "next/server";

import { WorkspaceRole } from "@prisma/client";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { workspaceDataScopeWhere } from "@/lib/auth/workspace-auth";
import { newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "project-stage-route";
type RouteContext = { params: Promise<{ id: string; stageId: string }> };

function parseOptionalDate(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return false;
  const date = newDate(value);
  return Number.isNaN(date.getTime()) ? false : date;
}

async function findStage(
  projectId: string,
  stageId: string,
  userId: string,
  workspace: Parameters<typeof workspaceDataScopeWhere>[0]
) {
  return prisma.projectStage.findFirst({
    where: {
      id: stageId,
      projectId,
      project: {
        ...workspaceDataScopeWhere(workspace, userId),
        status: "active",
      },
    },
  });
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE, {
      requiredRole: WorkspaceRole.EDITOR,
    });
    if ("response" in auth) return auth.response;

    const { id: projectId, stageId } = await params;
    const stage = await findStage(
      projectId,
      stageId,
      auth.userId,
      auth.workspace
    );
    if (!stage) return new NextResponse("Stage not found", { status: 404 });

    const body = (await request.json()) as Record<string, unknown>;
    const startDate = parseOptionalDate(body.startDate);
    const deadline = parseOptionalDate(body.deadline);
    const duration = body.expectedDurationDays;
    const nextStart = startDate === undefined ? stage.startDate : startDate;
    const nextDeadline = deadline === undefined ? stage.deadline : deadline;
    if (
      startDate === false ||
      deadline === false ||
      (body.name !== undefined &&
        (typeof body.name !== "string" || !body.name.trim())) ||
      (body.position !== undefined && typeof body.position !== "number") ||
      (duration !== undefined &&
        duration !== null &&
        (!Number.isInteger(duration) || (duration as number) < 0)) ||
      (nextStart && nextDeadline && nextStart > nextDeadline)
    ) {
      return NextResponse.json(
        { error: "Invalid stage input" },
        { status: 400 }
      );
    }

    const updated = await prisma.projectStage.update({
      where: { id: stageId },
      data: {
        name: typeof body.name === "string" ? body.name.trim() : undefined,
        color:
          typeof body.color === "string"
            ? body.color
            : body.color === null
              ? null
              : undefined,
        position: typeof body.position === "number" ? body.position : undefined,
        startDate,
        deadline,
        expectedDurationDays:
          typeof duration === "number"
            ? duration
            : duration === null
              ? null
              : undefined,
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    logger.error(
      "Failed to update project stage",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
