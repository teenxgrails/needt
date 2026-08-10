import { NextRequest, NextResponse } from "next/server";

import {
  PageAccessServiceError,
  listPageAccessGrants,
  removePageAccessGrant,
  setPageAccessGrant,
} from "@/services/pages/page-access-service";
import { PageAccessRole } from "@prisma/client";

import { authenticateRequest } from "@/lib/auth/api-auth";

const LOG_SOURCE = "PagePermissionsAPI";
type RouteContext = { params: Promise<{ id: string }> };

function accessError(error: unknown) {
  if (error instanceof PageAccessServiceError) {
    return NextResponse.json({ error: error.code }, { status: error.status });
  }
  throw error;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    return NextResponse.json(await listPageAccessGrants(auth, id));
  } catch (error) {
    return accessError(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const role = Object.values(PageAccessRole).includes(body.role)
    ? (body.role as PageAccessRole)
    : null;
  if (typeof body.userId !== "string" || !role) {
    return NextResponse.json(
      { error: "userId and role are required" },
      { status: 400 }
    );
  }
  try {
    return NextResponse.json({
      grant: await setPageAccessGrant(auth, id, body.userId, role),
    });
  } catch (error) {
    return accessError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  if (typeof body.userId !== "string") {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  try {
    await removePageAccessGrant(auth, id, body.userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return accessError(error);
  }
}
