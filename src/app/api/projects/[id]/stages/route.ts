import { NextRequest, NextResponse } from "next/server";

import { WorkspaceRole } from "@prisma/client";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { workspaceDataScopeWhere } from "@/lib/auth/workspace-auth";
import { newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "project-stages-route";
type RouteContext = { params: Promise<{ id: string }> };

function parseDate(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const date = newDate(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE, {
      requiredRole: WorkspaceRole.EDITOR,
    });
    if ("response" in auth) return auth.response;

    const { id: projectId } = await params;
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        status: "active",
        ...workspaceDataScopeWhere(auth.workspace, auth.userId),
      },
      select: { id: true },
    });
    if (!project) return new NextResponse("Project not found", { status: 404 });

    const body = (await request.json()) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const startDate = parseDate(body.startDate);
    const deadline = parseDate(body.deadline);
    const duration = body.expectedDurationDays;
    if (
      !name ||
      startDate === undefined ||
      deadline === undefined ||
      (duration !== undefined &&
        duration !== null &&
        (!Number.isInteger(duration) || (duration as number) < 0)) ||
      (startDate && deadline && startDate > deadline)
    ) {
      return NextResponse.json(
        { error: "Invalid stage input" },
        { status: 400 }
      );
    }

    const position =
      typeof body.position === "number"
        ? body.position
        : ((
            await prisma.projectStage.aggregate({
              where: { projectId },
              _max: { position: true },
            })
          )._max.position ?? -1) + 1;

    const stage = await prisma.projectStage.create({
      data: {
        projectId,
        name,
        color: typeof body.color === "string" ? body.color : null,
        position,
        startDate,
        deadline,
        expectedDurationDays: typeof duration === "number" ? duration : null,
      },
    });
    return NextResponse.json(stage, { status: 201 });
  } catch (error) {
    logger.error(
      "Failed to create project stage",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
