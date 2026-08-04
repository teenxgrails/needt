import { NextRequest, NextResponse } from "next/server";

import { WorkspaceRole } from "@prisma/client";
import { z } from "zod";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { workspaceApiError } from "@/lib/workspaces/api-response";
import {
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
} from "@/services/workspaces/workspace-service";

const LOG_SOURCE = "workspace-member-route";
type RouteContext = { params: Promise<{ id: string; userId: string }> };
const updateRoleSchema = z.object({ role: z.nativeEnum(WorkspaceRole) });

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;

  try {
    const [{ id, userId }, input] = await Promise.all([
      params,
      request.json().then((body) => updateRoleSchema.parse(body)),
    ]);
    const member = await updateWorkspaceMemberRole({
      userId: auth.userId,
      workspaceId: id,
      memberUserId: userId,
      role: input.role,
    });
    return NextResponse.json({ member });
  } catch (error) {
    const response = workspaceApiError(error);
    if (response) return response;
    logger.error(
      "Failed to update workspace member",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;

  try {
    const { id, userId } = await params;
    await removeWorkspaceMember({
      userId: auth.userId,
      workspaceId: id,
      memberUserId: userId,
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const response = workspaceApiError(error);
    if (response) return response;
    logger.error(
      "Failed to remove workspace member",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
