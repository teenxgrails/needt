import { NextRequest, NextResponse } from "next/server";

import { declineWorkspaceInvite } from "@/services/workspaces/workspace-service";
import { z } from "zod";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import {
  accountRule,
  enforceRateLimits,
  ipRule,
} from "@/lib/security/rate-limit";
import { workspaceApiError } from "@/lib/workspaces/api-response";

const LOG_SOURCE = "workspace-invite-decline-route";
const declineSchema = z.object({ token: z.string().min(32).max(256) });

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const limited = await enforceRateLimits(
    [
      ipRule(request, "workspace-invite-decline:ip", 60, 60 * 60),
      accountRule(auth.userId, "workspace-invite-decline:account", 20, 60 * 60),
    ],
    { route: request.nextUrl.pathname, userId: auth.userId }
  );
  if (limited) return limited;

  try {
    const { token } = declineSchema.parse(await request.json());
    await declineWorkspaceInvite(auth.userId, token);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const response = workspaceApiError(error);
    if (response) return response;
    logger.error(
      "Failed to decline workspace invite",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
