import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, "SchedulingRunAPI");
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const run = await prisma.schedulingRun.findFirst({
    where: { id, userId: auth.userId },
    select: {
      id: true,
      status: true,
      changedTaskCount: true,
      placedBlockCount: true,
      unchangedTaskCount: true,
      unscheduled: true,
      errorCode: true,
      errorMessage: true,
      createdAt: true,
      startedAt: true,
      finishedAt: true,
    },
  });
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }
  return NextResponse.json(run);
}
