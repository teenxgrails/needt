import { NextRequest, NextResponse } from "next/server";

import { sendConnectorWebhook } from "@/services/connectors/webhooks";
import { scheduleAllTasksForUser } from "@/services/scheduling/TaskSchedulingService";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { repushDirtyBlocks } from "@/lib/task-block-push";

const LOG_SOURCE = "task-schedule-route";

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    // Use the common function to schedule all tasks
    // If settings are provided, use them, otherwise use the overloaded function
    const tasksWithRelations = await scheduleAllTasksForUser(userId);

    // Repush dirty blocks and newly scheduled tasks to calendar
    await repushDirtyBlocks(userId);
    await sendConnectorWebhook({
      userId,
      event: "schedule.changed",
      payload: { taskCount: tasksWithRelations.length },
    });

    return NextResponse.json(tasksWithRelations);
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
