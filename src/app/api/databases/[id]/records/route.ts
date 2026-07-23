import { NextRequest, NextResponse } from "next/server";

import { routeErrorResponse } from "@/lib/api/route-error";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { createDatabaseRecord } from "@/services/pages/database-service";

const LOG_SOURCE = "DatabaseRecordsAPI";
type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    const body = await request.json().catch(() => ({}));
    const record = await createDatabaseRecord(auth.userId, id, {
      title: typeof body.title === "string" ? body.title : undefined,
      values: body.values && typeof body.values === "object" ? JSON.parse(JSON.stringify(body.values)) : {},
    });
    if (!record) return NextResponse.json({ error: "Database not found" }, { status: 404 });
    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    return routeErrorResponse(error, "Failed to create database record", LOG_SOURCE, "Could not add record.");
  }
}
