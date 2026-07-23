import { DatabaseViewType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { routeErrorResponse } from "@/lib/api/route-error";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { createDatabaseView } from "@/services/pages/database-service";

const LOG_SOURCE = "DatabaseViewsAPI";
const viewTypes = new Set(Object.values(DatabaseViewType));
type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body.name !== "string" || !viewTypes.has(body.type)) {
      return NextResponse.json({ error: "Valid name and view type are required" }, { status: 400 });
    }
    const view = await createDatabaseView(auth.userId, id, { name: body.name, type: body.type });
    if (!view) return NextResponse.json({ error: "Database not found" }, { status: 404 });
    return NextResponse.json({ view }, { status: 201 });
  } catch (error) {
    return routeErrorResponse(error, "Failed to create database view", LOG_SOURCE, "Could not add view.");
  }
}
