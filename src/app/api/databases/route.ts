import { NextRequest, NextResponse } from "next/server";

import { routeErrorResponse } from "@/lib/api/route-error";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { createDatabase } from "@/services/pages/page-service";

const LOG_SOURCE = "PageDatabasesAPI";

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  try {
    const body = await request.json().catch(() => ({}));
    const page = await createDatabase(auth.userId, {
      title: typeof body.title === "string" ? body.title : "New database",
      parentId: typeof body.parentId === "string" ? body.parentId : null,
      isPrivate: body.isPrivate === true,
    });
    return NextResponse.json({ page }, { status: 201 });
  } catch (error) {
    return routeErrorResponse(error, "Failed to create database", LOG_SOURCE, "Could not create database.");
  }
}
