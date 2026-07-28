import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "notifications-route";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const notifications = await prisma.proactiveNudge.findMany({
    where: { userId: auth.userId, deliveredAt: null },
    orderBy: { createdAt: "asc" },
    take: 20,
  });
  if (notifications.length > 0) {
    await prisma.proactiveNudge.updateMany({
      where: {
        userId: auth.userId,
        id: { in: notifications.map((notification) => notification.id) },
        deliveredAt: null,
      },
      data: { deliveredAt: new Date() },
    });
  }
  return NextResponse.json({ notifications });
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const body = (await request.json()) as { id?: unknown };
  if (typeof body.id !== "string") {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  await prisma.proactiveNudge.updateMany({
    where: { id: body.id, userId: auth.userId },
    data: { readAt: new Date() },
  });
  return new NextResponse(null, { status: 204 });
}
