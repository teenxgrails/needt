import { NextRequest, NextResponse } from "next/server";

import { activeSummary, getActiveSession } from "@/services/focus/focusSession";

import { routeErrorResponse } from "@/lib/api/route-error";
import { authenticateRequest } from "@/lib/auth/api-auth";

const LOG_SOURCE = "focus-active-route";

/**
 * GET /api/focus/active -> { active, taskId, endsAt }
 *
 * Deliberately small and cheap. A future Chrome extension will poll this
 * endpoint to enforce website/app blocking while a focus session runs, so the
 * response shape is a stable contract: `active` whether a session is running,
 * `taskId` of the bound task (or null), and `endsAt` as an ISO timestamp when
 * the countdown reaches zero (null for a free/flow session or when idle).
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;

  try {
    const session = await getActiveSession(auth.userId);
    return NextResponse.json(activeSummary(session));
  } catch (error) {
    return routeErrorResponse(
      error,
      "Failed to load focus summary",
      LOG_SOURCE,
      "Could not load focus summary."
    );
  }
}
