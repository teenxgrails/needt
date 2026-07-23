import { NextRequest, NextResponse } from "next/server";

import { routeErrorResponse } from "@/lib/api/route-error";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { composioProvider } from "@/services/integrations/composio-provider";

const LOG_SOURCE = "IntegrationActionsAPI";

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body.toolkit !== "string" || typeof body.tool !== "string") {
      return NextResponse.json({ error: "Toolkit and tool are required" }, { status: 400 });
    }
    const permission = body.permission === "write" ? "write" : "read";
    if (permission === "write" && body.confirmed !== true) {
      return NextResponse.json({ error: "Write action requires confirmation" }, { status: 409 });
    }
    const result = await composioProvider.executeAction({
      userId: auth.userId,
      toolkit: body.toolkit,
      tool: body.tool,
      arguments: body.arguments && typeof body.arguments === "object" ? body.arguments : {},
      permission,
      confirmed: body.confirmed === true,
    });
    return NextResponse.json({ result });
  } catch (error) {
    return routeErrorResponse(error, "Failed to execute integration action", LOG_SOURCE, "Could not run integration action.");
  }
}
