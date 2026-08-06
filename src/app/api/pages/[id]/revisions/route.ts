import { NextRequest, NextResponse } from "next/server";

import {
  listPageRevisions,
  restorePageRevision,
} from "@/services/pages/page-service";
import { WorkspaceRole } from "@prisma/client";

import { routeErrorResponse } from "@/lib/api/route-error";
import { authenticateRequest } from "@/lib/auth/api-auth";

const LOG_SOURCE = "PageRevisionsAPI";
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    const revisions = await listPageRevisions(auth, id);
    if (!revisions) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }
    return NextResponse.json({ revisions });
  } catch (error) {
    return routeErrorResponse(
      error,
      "Failed to load page revisions",
      LOG_SOURCE,
      "Could not load page history."
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE, {
    requiredRole: WorkspaceRole.EDITOR,
  });
  if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body.revisionId !== "string") {
      return NextResponse.json(
        { error: "revisionId is required" },
        { status: 400 }
      );
    }
    const page = await restorePageRevision(auth, id, body.revisionId);
    if (!page) {
      return NextResponse.json(
        { error: "Revision not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ page });
  } catch (error) {
    return routeErrorResponse(
      error,
      "Failed to restore page revision",
      LOG_SOURCE,
      "Could not restore page history."
    );
  }
}
