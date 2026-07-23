import { PageAuthor } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { routeErrorResponse } from "@/lib/api/route-error";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { createPage, listPages } from "@/services/pages/page-service";

const LOG_SOURCE = "PagesAPI";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  try {
    const pages = await listPages(auth.userId);
    return NextResponse.json({ pages });
  } catch (error) {
    return routeErrorResponse(error, "Failed to list pages", LOG_SOURCE, "Could not load pages.");
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  try {
    const body = await request.json().catch(() => ({}));
    const page = await createPage(auth.userId, {
      title: typeof body.title === "string" ? body.title : undefined,
      parentId: typeof body.parentId === "string" ? body.parentId : null,
      icon: typeof body.icon === "string" ? body.icon : null,
      isPrivate: body.isPrivate === true,
      createdBy: PageAuthor.HUMAN,
    });
    return NextResponse.json({ page }, { status: 201 });
  } catch (error) {
    return routeErrorResponse(error, "Failed to create page", LOG_SOURCE, "Could not create page.");
  }
}
