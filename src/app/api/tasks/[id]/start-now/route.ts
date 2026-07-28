import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import {
  ActiveFocusSessionError,
  startTaskNow,
  TaskNotFoundError,
  OutsideWorkHoursError,
} from "@/services/tasks/startTaskNow";

import { authenticateRequest } from "@/lib/auth/api-auth";

const schema = z.object({
  durationMinutes: z.number().int().min(5).max(12 * 60),
  startFocus: z.boolean().default(true),
  confirmOutsideWorkHours: z.boolean().default(false),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, "StartTaskNowAPI");
  if ("response" in auth) return auth.response;
  const key = request.headers.get("Idempotency-Key");
  if (!key || key.length > 128) {
    return NextResponse.json(
      { error: "A valid Idempotency-Key is required." },
      { status: 400 }
    );
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid start request." }, { status: 400 });
  }
  const { id } = await params;
  try {
    const command = await startTaskNow({
      userId: auth.userId,
      taskId: id,
      durationMinutes: parsed.data.durationMinutes,
      startFocus: parsed.data.startFocus,
      idempotencyKey: key,
      confirmOutsideWorkHours: parsed.data.confirmOutsideWorkHours,
    });
    return NextResponse.json({
      commandId: command.id,
      status: command.status,
      result: command.result,
    });
  } catch (error) {
    if (error instanceof ActiveFocusSessionError) {
      return NextResponse.json(
        { error: "A focus session is already active." },
        { status: 409 }
      );
    }
    if (error instanceof TaskNotFoundError) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }
    if (error instanceof OutsideWorkHoursError) {
      return NextResponse.json(
        { error: "OUTSIDE_WORK_HOURS", requiresConfirmation: true },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Could not start task." }, { status: 500 });
  }
}
