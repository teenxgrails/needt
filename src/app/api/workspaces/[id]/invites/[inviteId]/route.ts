import { NextRequest, NextResponse } from "next/server";

import { revokeWorkspaceInvite } from "@/services/workspaces/workspace-service";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { workspaceApiError } from "@/lib/workspaces/api-response";

const LOG_SOURCE = "workspace-invite-route";
type RouteContext = { params: Promise<{ id: string; inviteId: string }> };

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;

  try {
    const { id, inviteId } = await params;
    await revokeWorkspaceInvite({
      userId: auth.userId,
      workspaceId: id,
      inviteId,
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const response = workspaceApiError(error);
    if (response) return response;
    logger.error(
      "Failed to revoke workspace invite",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
