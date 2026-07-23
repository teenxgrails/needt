import { DatabasePropertyType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { routeErrorResponse } from "@/lib/api/route-error";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { createDatabaseProperty } from "@/services/pages/database-service";

const LOG_SOURCE = "DatabasePropertiesAPI";
const propertyTypes = new Set(Object.values(DatabasePropertyType));
type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body.name !== "string" || !propertyTypes.has(body.type)) {
      return NextResponse.json({ error: "Valid name and property type are required" }, { status: 400 });
    }
    const property = await createDatabaseProperty(auth.userId, id, {
      name: body.name,
      type: body.type,
      config: body.config === undefined ? undefined : JSON.parse(JSON.stringify(body.config)),
    });
    if (!property) return NextResponse.json({ error: "Database not found" }, { status: 404 });
    return NextResponse.json({ property }, { status: 201 });
  } catch (error) {
    return routeErrorResponse(error, "Failed to create database property", LOG_SOURCE, "Could not add property.");
  }
}
