import { NextRequest, NextResponse } from "next/server";

import { listPageBacklinks } from "@/services/pages/page-service";

import { routeErrorResponse } from "@/lib/api/route-error";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { resolvePageAccess } from "@/lib/auth/page-auth";

const LOG_SOURCE = "PageBacklinksAPI";
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    if (!(await resolvePageAccess(auth, id))) {
      return NextResponse.json(
        { error: "Page access denied" },
        { status: 403 }
      );
    }
    return NextResponse.json({ backlinks: await listPageBacklinks(auth, id) });
  } catch (error) {
    return routeErrorResponse(
      error,
      "Failed to load page backlinks",
      LOG_SOURCE,
      "Could not load page backlinks."
    );
  }
}
