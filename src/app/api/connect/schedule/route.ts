import { NextRequest, NextResponse } from "next/server";

import { authenticateConnectorToken } from "@/services/connectors/auth";

import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const userId = await authenticateConnectorToken(
    request.headers.get("authorization")
  );
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      status: { not: "completed" },
      OR: [{ scheduledEnd: { gte: now } }, { scheduledEnd: null }],
    },
    orderBy: [{ scheduledStart: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    generatedAt: now.toISOString(),
    tasks,
  });
}
