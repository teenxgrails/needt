import { ExternalIntegrationStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "IntegrationCallbackAPI";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const toolkit = request.nextUrl.searchParams.get("toolkit");
  if (toolkit) {
    await prisma.externalIntegration.updateMany({
      where: { userId: auth.userId, provider: "composio", toolkit },
      data: { status: ExternalIntegrationStatus.CONNECTED },
    });
    await logger.info("External integration callback completed", { userId: auth.userId, toolkit }, LOG_SOURCE);
  }
  return NextResponse.redirect(new URL("/settings#integrations", request.nextUrl.origin));
}
