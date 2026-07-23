import { ExternalIntegrationStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { routeErrorResponse } from "@/lib/api/route-error";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "IntegrationDisconnectAPI";

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body.id !== "string") return NextResponse.json({ error: "Connection id is required" }, { status: 400 });
    const result = await prisma.externalIntegration.updateMany({
      where: { id: body.id, userId: auth.userId },
      data: { status: ExternalIntegrationStatus.DISCONNECTED },
    });
    if (result.count === 0) return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return routeErrorResponse(error, "Failed to disconnect integration", LOG_SOURCE, "Could not disconnect integration.");
  }
}
