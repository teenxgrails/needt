import { NextRequest, NextResponse } from "next/server";

import { authenticateConnectorRequest } from "@/services/connectors/auth";
import { scheduleAllTasksForUser } from "@/services/scheduling/TaskSchedulingService";
import { WorkspaceRole } from "@prisma/client";

import { workspaceDataScopeWhere } from "@/lib/auth/workspace-auth";
import { prisma } from "@/lib/prisma";

import {
  SchedulingEnergyLevel,
  SchedulingTaskPriority,
  TaskStatus,
} from "@/types/task";

function isEnergy(value: unknown): value is SchedulingEnergyLevel {
  return value === "LOW" || value === "MEDIUM" || value === "HIGH";
}

function isPriority(value: unknown): value is SchedulingTaskPriority {
  return (
    value === "LOW" ||
    value === "MEDIUM" ||
    value === "HIGH" ||
    value === "URGENT"
  );
}

export async function GET(request: NextRequest) {
  const auth = await authenticateConnectorRequest(
    request,
    WorkspaceRole.VIEWER
  );
  if ("response" in auth) return auth.response;
  const { userId, workspace } = auth;

  const tasks = await prisma.task.findMany({
    where: {
      ...workspaceDataScopeWhere(workspace, userId),
      isArchived: false,
    },
    orderBy: [{ scheduledStart: "asc" }, { createdAt: "desc" }],
    include: { scheduledBlocks: { orderBy: { chunkIndex: "asc" } } },
  });

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    tasks,
  });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateConnectorRequest(
    request,
    WorkspaceRole.EDITOR
  );
  if ("response" in auth) return auth.response;
  const { userId, workspace } = auth;

  const body = await request.json();
  if (typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const task = await prisma.task.create({
    data: {
      userId,
      workspaceId: workspace.workspaceId,
      assigneeId: userId,
      title: body.title.trim(),
      description:
        typeof body.description === "string" ? body.description.trim() : null,
      status: TaskStatus.TODO,
      duration: Number.isFinite(Number(body.estimatedMinutes))
        ? Math.round(Number(body.estimatedMinutes))
        : undefined,
      estimatedMinutes: Number.isFinite(Number(body.estimatedMinutes))
        ? Math.round(Number(body.estimatedMinutes))
        : undefined,
      deadline: body.deadline ? new Date(body.deadline) : null,
      dueDate: body.deadline ? new Date(body.deadline) : null,
      priorityLevel: isPriority(body.priorityLevel)
        ? body.priorityLevel
        : "MEDIUM",
      energyRequired: isEnergy(body.energyRequired)
        ? body.energyRequired
        : "MEDIUM",
      contextTag:
        typeof body.contextTag === "string" ? body.contextTag.trim() : null,
      isAutoScheduled: true,
      autoScheduled: true,
      scheduleLocked: false,
      isFrozen: false,
      isRecurring: false,
      activities: {
        create: {
          workspaceId: workspace.workspaceId,
          actorId: userId,
          action: "CREATED",
        },
      },
    },
  });

  await scheduleAllTasksForUser(userId, {
    workspaceId:
      workspace.dataScope.mode === "workspace"
        ? workspace.workspaceId
        : undefined,
  });

  const scheduledTask = await prisma.task.findFirst({
    where: { id: task.id, ...workspaceDataScopeWhere(workspace, userId) },
    include: { scheduledBlocks: { orderBy: { chunkIndex: "asc" } } },
  });

  return NextResponse.json(scheduledTask || task, { status: 201 });
}
