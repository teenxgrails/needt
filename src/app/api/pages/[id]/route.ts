import { NextRequest, NextResponse } from "next/server";

import { routeErrorResponse } from "@/lib/api/route-error";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { getPage, updatePage } from "@/services/pages/page-service";

const LOG_SOURCE = "PageDetailAPI";
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    const page = await getPage(auth.userId, id);
    if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });
    return NextResponse.json({ page });
  } catch (error) {
    return routeErrorResponse(error, "Failed to load page", LOG_SOURCE, "Could not load page.");
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    const body = await request.json().catch(() => ({}));
    const page = await updatePage(auth.userId, id, {
      title: typeof body.title === "string" ? body.title : undefined,
      icon: body.icon === null || typeof body.icon === "string" ? body.icon : undefined,
      coverUrl: body.coverUrl === null || typeof body.coverUrl === "string" ? body.coverUrl : undefined,
      parentId: body.parentId === null || typeof body.parentId === "string" ? body.parentId : undefined,
      isPrivate: typeof body.isPrivate === "boolean" ? body.isPrivate : undefined,
      isFavorite: typeof body.isFavorite === "boolean" ? body.isFavorite : undefined,
      position: typeof body.position === "number" ? body.position : undefined,
      trashed: typeof body.trashed === "boolean" ? body.trashed : undefined,
    });
    if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });
    return NextResponse.json({ page });
  } catch (error) {
    return routeErrorResponse(error, "Failed to update page", LOG_SOURCE, "Could not update page.");
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    const page = await updatePage(auth.userId, id, { trashed: true });
    if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return routeErrorResponse(error, "Failed to trash page", LOG_SOURCE, "Could not move page to trash.");
  }
}
