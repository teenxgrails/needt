import { NextRequest, NextResponse } from "next/server";

import {
  type FlatCheckoutCompleted,
  type FlatSubscriptionEvent,
  Webhook,
} from "@creem_io/nextjs";

import { CreemBillingEventType } from "@/lib/creem/webhook-mapping";
import { processCreemBillingEvent } from "@/lib/creem/webhook-processor";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "CreemWebhookAPI";

async function handleEvent(
  eventType: CreemBillingEventType,
  object: FlatCheckoutCompleted | FlatSubscriptionEvent<string>
) {
  const result = await processCreemBillingEvent({
    eventType,
    object: object as unknown as Record<string, unknown>,
  });
  if (!result.processed) {
    await logger.warn(
      "Ignored Creem billing event",
      {
        eventType,
        reason: result.reason || "unknown",
        webhookId: object.webhookId,
      },
      LOG_SOURCE
    );
    return;
  }
  logger.info(
    "Processed Creem billing event",
    { eventType, webhookId: object.webhookId },
    LOG_SOURCE
  );
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.CREEM_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Creem webhook is not configured." },
      { status: 503 }
    );
  }

  const handler = Webhook({
    webhookSecret,
    onCheckoutCompleted: (event) => handleEvent("checkout.completed", event),
    onSubscriptionActive: (event) => handleEvent("subscription.active", event),
    onSubscriptionPaid: (event) => handleEvent("subscription.paid", event),
    onSubscriptionCanceled: (event) =>
      handleEvent("subscription.canceled", event),
    onSubscriptionScheduledCancel: (event) =>
      handleEvent("subscription.scheduled_cancel", event),
    onSubscriptionPastDue: (event) =>
      handleEvent("subscription.past_due", event),
    onSubscriptionUnpaid: (event) => handleEvent("subscription.unpaid", event),
    onSubscriptionExpired: (event) =>
      handleEvent("subscription.expired", event),
    onSubscriptionPaused: (event) => handleEvent("subscription.paused", event),
    onSubscriptionUpdate: (event) => handleEvent("subscription.update", event),
  });

  const response = await handler(request);
  if (!response.ok) {
    await logger.warn(
      "Creem webhook request failed verification or processing",
      { status: response.status },
      LOG_SOURCE
    );
  }
  return response;
}
