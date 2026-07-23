import { NextRequest, NextResponse } from "next/server";

import { routeErrorResponse } from "@/lib/api/route-error";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";
import { getIntegrationCatalog } from "@/services/integrations/catalog";

const LOG_SOURCE = "IntegrationCatalogAPI";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  try {
    const [catalog, connections] = await Promise.all([
      getIntegrationCatalog(),
      prisma.externalIntegration.findMany({
        where: { userId: auth.userId },
        select: { id: true, provider: true, toolkit: true, status: true, externalConnectionId: true },
      }),
    ]);
    return NextResponse.json({ catalog, connections });
  } catch (error) {
    return routeErrorResponse(error, "Failed to load integration catalog", LOG_SOURCE, "Could not load integrations.");
  }
}
