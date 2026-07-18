import { NextRequest, NextResponse } from "next/server";

import {
  finalizeSession,
  getActiveSession,
  pauseSession,
  resumeSession,
  startSession,
} from "@/services/focus/focusSession";
import { FocusSessionMode } from "@prisma/client";

import { routeErrorResponse } from "@/lib/api/route-error";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "focus-session-route";

function parseMode(value: unknown): FocusSessionMode {
  if (value === FocusSessionMode.FLOW) return FocusSessionMode.FLOW;
  if (value === FocusSessionMode.DEEP_FOCUS) return FocusSessionMode.DEEP_FOCUS;
  return FocusSessionMode.POMODORO;
}

// GET /api/focus/session -> the full active session (or { active: false }).
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;

  try {
    const session = await getActiveSession(auth.userId);
    return NextResponse.json({ active: Boolean(session), session });
  } catch (error) {
    return routeErrorResponse(
      error,
      "Failed to load active focus session",
      LOG_SOURCE,
      "Could not load active focus session."
    );
  }
}

// POST /api/focus/session -> lifecycle actions keyed by body.action:
// start | pause | resume | stop. Server owns all timing.
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => ({}));
  const action = body.action as string;

  try {
    switch (action) {
      case "start": {
        const session = await startSession({
          userId: auth.userId,
          taskId: typeof body.taskId === "string" ? body.taskId : null,
          mode: parseMode(body.mode),
          plannedMinutes:
            body.plannedMinutes == null
              ? null
              : Math.max(1, Math.round(Number(body.plannedMinutes))),
          source: typeof body.source === "string" ? body.source : "web",
        });
        return NextResponse.json({ session });
      }
      case "pause": {
        const session = await pauseSession(auth.userId, String(body.sessionId));
        return NextResponse.json({ session });
      }
      case "resume": {
        const session = await resumeSession(
          auth.userId,
          String(body.sessionId)
        );
        return NextResponse.json({ session });
      }
      case "stop": {
        const session = await finalizeSession({
          userId: auth.userId,
          sessionId: String(body.sessionId),
          completed: Boolean(body.completed),
          markTaskDone: Boolean(body.markTaskDone),
        });
        return NextResponse.json({ session });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    await logger.error(
      "Focus session action failed",
      { action, error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Focus session action failed" },
      { status: 500 }
    );
  }
}
