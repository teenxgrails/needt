import { NextRequest, NextResponse } from "next/server";

import { authenticateConnectorToken } from "@/services/connectors/auth";
import { scheduleAllTasksForUser } from "@/services/scheduling/TaskSchedulingService";

import { prisma } from "@/lib/prisma";

async function readSchedule(userId: string) {
  const now = new Date();
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      status: { not: "completed" },
      OR: [
        { scheduledEnd: { gte: now } },
        { scheduledEnd: null },
        { scheduledBlocks: { some: { end: { gte: now } } } },
      ],
    },
    orderBy: [{ scheduledStart: "asc" }, { createdAt: "desc" }],
    include: {
      scheduledBlocks: { orderBy: { chunkIndex: "asc" } },
    },
  });

  return {
    generatedAt: now.toISOString(),
    tasks,
  };
}

export async function GET(request: NextRequest) {
  const userId = await authenticateConnectorToken(
    request.headers.get("authorization")
  );
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await readSchedule(userId));
}

export async function POST(request: NextRequest) {
  const userId = await authenticateConnectorToken(
    request.headers.get("authorization")
  );
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await scheduleAllTasksForUser(userId);
  return NextResponse.json(await readSchedule(userId));
}
