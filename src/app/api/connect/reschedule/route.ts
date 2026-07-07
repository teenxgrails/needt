import { NextRequest, NextResponse } from "next/server";

import { authenticateConnectorToken } from "@/services/connectors/auth";
import { sendConnectorWebhook } from "@/services/connectors/webhooks";
import { scheduleAllTasksForUser } from "@/services/scheduling/TaskSchedulingService";

export async function POST(request: NextRequest) {
  const userId = await authenticateConnectorToken(
    request.headers.get("authorization")
  );
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tasks = await scheduleAllTasksForUser(userId);
  await sendConnectorWebhook({
    userId,
    event: "schedule.changed",
    payload: { taskCount: tasks.length },
  });

  return NextResponse.json({ tasks });
}
