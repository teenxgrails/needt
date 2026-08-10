import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import {
  accountRule,
  enforceRateLimits,
  ipRule,
} from "@/lib/security/rate-limit";
import { workspaceApiError } from "@/lib/workspaces/api-response";
import { acceptWorkspaceInvite } from "@/services/workspaces/workspace-service";

const LOG_SOURCE = "workspace-invite-accept-route";
const acceptSchema = z.object({ token: z.string().min(32).max(256) });

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const limited = await enforceRateLimits(
    [
      ipRule(request, "workspace-invite-accept:ip", 60, 60 * 60),
      accountRule(
        auth.userId,
        "workspace-invite-accept:account",
        20,
        60 * 60
      ),
    ],
    { route: request.nextUrl.pathname, userId: auth.userId }
  );
  if (limited) return limited;

  try {
    const { token } = acceptSchema.parse(await request.json());
    const membership = await acceptWorkspaceInvite(auth.userId, token);
    return NextResponse.json({ membership });
  } catch (error) {
    const response = workspaceApiError(error);
    if (response) return response;
    logger.error(
      "Failed to accept workspace invite",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
