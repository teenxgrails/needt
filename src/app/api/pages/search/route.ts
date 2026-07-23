import { NextRequest, NextResponse } from "next/server";

import { routeErrorResponse } from "@/lib/api/route-error";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { listPages } from "@/services/pages/page-service";

const LOG_SOURCE = "PageSearchAPI";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  try {
    const pages = await listPages(auth.userId, { search: request.nextUrl.searchParams.get("q") ?? "" });
    return NextResponse.json({ pages });
  } catch (error) {
    return routeErrorResponse(error, "Failed to search pages", LOG_SOURCE, "Could not search pages.");
  }
}
