import { NextRequest, NextResponse } from "next/server";

import { setHabitCompletionToday } from "@/services/habits/habit-service";
import { WorkspaceRole } from "@prisma/client";

import { authenticateRequest } from "@/lib/auth/api-auth";

const LOG_SOURCE = "HabitCompletionAPI";
type RouteContext = { params: Promise<{ id: string }> };

async function setCompletion(
  request: NextRequest,
  context: RouteContext,
  completed: boolean
) {
  const auth = await authenticateRequest(request, LOG_SOURCE, {
    requiredRole: WorkspaceRole.EDITOR,
  });
  if ("response" in auth) return auth.response;
  if (!auth.workspace) {
    return NextResponse.json(
      { error: "Workspace unavailable" },
      { status: 500 }
    );
  }

  const { id } = await context.params;
  const result = await setHabitCompletionToday({
    userId: auth.userId,
    workspace: auth.workspace,
    habitId: id,
    completed,
  });
  if (!result) {
    return NextResponse.json({ error: "Habit not found" }, { status: 404 });
  }
  return NextResponse.json(result);
}

export function PUT(request: NextRequest, context: RouteContext) {
  return setCompletion(request, context, true);
}

export function DELETE(request: NextRequest, context: RouteContext) {
  return setCompletion(request, context, false);
}
