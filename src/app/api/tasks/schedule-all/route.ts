import { NextRequest, NextResponse } from "next/server";

import { SchedulingRunSource } from "@prisma/client";

import {
  createSchedulingRun,
  executeSchedulingRun,
} from "@/services/scheduling/runs";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import {
  enqueueReschedule,
  isQueueConfigured,
} from "@/lib/queue/enqueue";

const LOG_SOURCE = "task-schedule-route";

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const dedupeKey =
      request.headers.get("Idempotency-Key") ||
      `manual:${Math.floor(Date.now() / 10_000)}`;
    const run = await createSchedulingRun({
      userId: auth.userId,
      source: SchedulingRunSource.MANUAL,
      dedupeKey,
    });

    if (isQueueConfigured()) {
      await enqueueReschedule(auth.userId, run.id);
      return NextResponse.json(
        { runId: run.id, status: run.status },
        { status: 202 }
      );
    }

    const completed = await executeSchedulingRun(run.id);
    if (!completed) {
      throw new Error("Scheduling run disappeared before execution.");
    }
    return NextResponse.json({
      runId: completed.id,
      status: completed.status,
      changedTaskCount: completed.changedTaskCount,
      unscheduled: completed.unscheduled,
    });
  } catch (error) {
    logger.error(
      "Error scheduling tasks:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to schedule tasks" },
      { status: 500 }
    );
  }
}
