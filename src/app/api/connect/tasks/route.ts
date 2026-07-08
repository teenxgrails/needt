import { NextRequest, NextResponse } from "next/server";

import { authenticateConnectorToken } from "@/services/connectors/auth";
import { scheduleAllTasksForUser } from "@/services/scheduling/TaskSchedulingService";

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
  const userId = await authenticateConnectorToken(
    request.headers.get("authorization")
  );
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tasks = await prisma.task.findMany({
    where: { userId },
    orderBy: [{ scheduledStart: "asc" }, { createdAt: "desc" }],
    include: { scheduledBlocks: { orderBy: { chunkIndex: "asc" } } },
  });

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    tasks,
  });
}

export async function POST(request: NextRequest) {
  const userId = await authenticateConnectorToken(
    request.headers.get("authorization")
  );
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  if (typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const task = await prisma.task.create({
    data: {
      userId,
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
    },
  });

  await scheduleAllTasksForUser(userId);

  const scheduledTask = await prisma.task.findUnique({
    where: { id: task.id, userId },
    include: { scheduledBlocks: { orderBy: { chunkIndex: "asc" } } },
  });

  return NextResponse.json(scheduledTask || task, { status: 201 });
}
