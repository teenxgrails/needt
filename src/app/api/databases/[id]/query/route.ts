import { NextRequest, NextResponse } from "next/server";

import { routeErrorResponse } from "@/lib/api/route-error";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { queryDatabase } from "@/services/pages/database-service";

const LOG_SOURCE = "DatabaseQueryAPI";
type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    const body = await request.json().catch(() => ({}));
    const records = await queryDatabase(auth.userId, id, {
      filters: Array.isArray(body.filters) ? body.filters : [],
      sort: Array.isArray(body.sort) ? body.sort : [],
    });
    if (!records) return NextResponse.json({ error: "Database not found" }, { status: 404 });
    return NextResponse.json({ records });
  } catch (error) {
    return routeErrorResponse(error, "Failed to query database", LOG_SOURCE, "Could not query database.");
  }
}
