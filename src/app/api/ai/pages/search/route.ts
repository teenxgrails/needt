import { NextRequest, NextResponse } from "next/server";

import { routeErrorResponse } from "@/lib/api/route-error";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { listAiReadablePages } from "@/services/pages/page-service";

const LOG_SOURCE = "AiReadablePagesAPI";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  try {
    const pages = await listAiReadablePages(auth.userId, request.nextUrl.searchParams.get("q") ?? "");
    return NextResponse.json({ pages });
  } catch (error) {
    return routeErrorResponse(error, "Failed to search AI-readable pages", LOG_SOURCE, "Could not search pages.");
  }
}
