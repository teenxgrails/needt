import { NextRequest, NextResponse } from "next/server";

import {
  deleteDatabaseRecord,
  updateDatabaseRecord,
} from "@/services/pages/database-service";

import { routeErrorResponse } from "@/lib/api/route-error";
import { authenticateRequest } from "@/lib/auth/api-auth";

const LOG_SOURCE = "DatabaseRecordAPI";
type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    const body = await request.json().catch(() => ({}));
    const record = await updateDatabaseRecord(auth.userId, id, {
      title: typeof body.title === "string" ? body.title : undefined,
      values:
        body.values && typeof body.values === "object"
          ? JSON.parse(JSON.stringify(body.values))
          : undefined,
    });
    if (!record)
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    return NextResponse.json({ record });
  } catch (error) {
    return routeErrorResponse(
      error,
      "Failed to update database record",
      LOG_SOURCE,
      "Could not update record."
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    if (!(await deleteDatabaseRecord(auth.userId, id))) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return routeErrorResponse(
      error,
      "Failed to delete database record",
      LOG_SOURCE,
      "Could not delete record."
    );
  }
}
