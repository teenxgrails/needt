import { NextRequest, NextResponse } from "next/server";

import { findGoogleWebhook } from "@/lib/calendar-db";
import { validateGoogleWebhookHeaders } from "@/lib/calendar-webhooks/validation";
import { logger } from "@/lib/logger";
import { enqueueCalendarSync } from "@/lib/queue/enqueue";

const LOG_SOURCE = "GoogleWebhookAPI";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const channelId = request.headers.get("x-goog-channel-id");
  const resourceId = request.headers.get("x-goog-resource-id");
  if (!channelId || !resourceId) {
    return NextResponse.json(
      { error: "Missing Google webhook headers" },
      { status: 400 }
    );
  }

  const webhook = await findGoogleWebhook(channelId, resourceId);
  if (!webhook || !validateGoogleWebhookHeaders(request.headers, webhook)) {
    await logger.warn(
      "Rejected Google webhook",
      { channelId, resourceId },
      LOG_SOURCE
    );
    return NextResponse.json({ error: "Invalid webhook" }, { status: 401 });
  }

  try {
    const job = await enqueueCalendarSync(webhook.feedId);
    if (!job) {
      return NextResponse.json({ error: "Queue unavailable" }, { status: 503 });
    }
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    await logger.error(
      "Failed to enqueue Google calendar sync",
      {
        feedId: webhook.feedId,
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return NextResponse.json({ error: "Queue unavailable" }, { status: 503 });
  }
}
