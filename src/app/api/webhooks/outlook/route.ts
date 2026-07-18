import { NextRequest, NextResponse } from "next/server";

import { findOutlookWebhook } from "@/lib/calendar-db";
import {
  OutlookChangeNotification,
  validateOutlookNotification,
} from "@/lib/calendar-webhooks/validation";
import { logger } from "@/lib/logger";
import { enqueueCalendarSync } from "@/lib/queue/enqueue";

const LOG_SOURCE = "OutlookWebhookAPI";

export const runtime = "nodejs";

interface OutlookNotificationBody {
  value?: OutlookChangeNotification[];
}

export async function POST(request: NextRequest) {
  const validationToken = request.nextUrl.searchParams.get("validationToken");
  if (validationToken) {
    return new NextResponse(validationToken, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  let body: OutlookNotificationBody;
  try {
    body = (await request.json()) as OutlookNotificationBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const feedIds = new Set<string>();
  for (const notification of body.value ?? []) {
    if (!notification.subscriptionId) continue;
    const webhook = await findOutlookWebhook(notification.subscriptionId);
    if (!webhook || !validateOutlookNotification(notification, webhook)) {
      await logger.warn(
        "Rejected Outlook webhook notification",
        { subscriptionId: notification.subscriptionId },
        LOG_SOURCE
      );
      return NextResponse.json({ error: "Invalid webhook" }, { status: 401 });
    }
    feedIds.add(webhook.feedId);
  }

  try {
    const jobs = await Promise.all(
      [...feedIds].map((feedId) => enqueueCalendarSync(feedId))
    );
    if (jobs.some((job) => !job)) {
      return NextResponse.json({ error: "Queue unavailable" }, { status: 503 });
    }
    return new NextResponse(null, { status: 202 });
  } catch (error) {
    await logger.error(
      "Failed to enqueue Outlook calendar sync",
      {
        feedIds: [...feedIds],
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return NextResponse.json({ error: "Queue unavailable" }, { status: 503 });
  }
}
