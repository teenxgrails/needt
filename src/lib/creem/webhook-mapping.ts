import type { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

import { CreemProductIds, getCreemProductIds } from "@/lib/creem/config";
import { newDate } from "@/lib/date-utils";

export type CreemBillingEventType =
  | "checkout.completed"
  | "subscription.active"
  | "subscription.paid"
  | "subscription.canceled"
  | "subscription.scheduled_cancel"
  | "subscription.past_due"
  | "subscription.unpaid"
  | "subscription.expired"
  | "subscription.paused"
  | "subscription.update";

export type CreemBillingEvent = {
  eventType: CreemBillingEventType;
  object: Record<string, unknown>;
};

export type CreemSubscriptionMutation = {
  userId: string | null;
  creemCustomerId: string | null;
  creemSubscriptionId: string | null;
  data: {
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    creemCustomerId: string | null;
    creemSubscriptionId: string | null;
    creemProductId: string;
    interval: "month" | "year" | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    amount?: number;
    discountApplied?: boolean;
  };
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function entityId(value: unknown): string | null {
  return stringValue(value) || stringValue(asRecord(value)?.id);
}

function field(
  object: Record<string, unknown>,
  camelCase: string,
  snakeCase: string
): unknown {
  return object[camelCase] ?? object[snakeCase];
}

function metadataUserId(object: Record<string, unknown>): string | null {
  const metadata = asRecord(object.metadata);
  const customer = asRecord(object.customer);
  const customerMetadata = asRecord(customer?.metadata);
  return (
    stringValue(metadata?.referenceId) ||
    stringValue(metadata?.userId) ||
    stringValue(customerMetadata?.referenceId) ||
    stringValue(customerMetadata?.userId)
  );
}

function dateValue(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const raw = stringValue(value);
  if (!raw) return null;
  const date = newDate(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function planForProduct(
  productId: string,
  products: CreemProductIds
): SubscriptionPlan | null {
  if (productId === products.lifetime) return "LIFETIME";
  if (productId === products.proMonthly || productId === products.proYearly) {
    return "PRO";
  }
  return null;
}

function intervalForProduct(
  productId: string,
  product: Record<string, unknown> | null,
  products: CreemProductIds
): "month" | "year" | null {
  if (productId === products.proMonthly) return "month";
  if (productId === products.proYearly) return "year";
  const period = stringValue(product?.billingPeriod ?? product?.billing_period);
  if (period === "every-month") return "month";
  if (period === "every-year") return "year";
  return null;
}

function statusForEvent(
  eventType: CreemBillingEventType,
  object: Record<string, unknown>
): SubscriptionStatus {
  if (
    eventType === "subscription.past_due" ||
    eventType === "subscription.unpaid"
  ) {
    return "PAST_DUE";
  }
  if (
    eventType === "subscription.canceled" ||
    eventType === "subscription.expired" ||
    eventType === "subscription.paused"
  ) {
    return "CANCELED";
  }
  if (eventType === "subscription.update") {
    const status = stringValue(object.status);
    if (status === "past_due" || status === "unpaid") return "PAST_DUE";
    if (status === "canceled" || status === "expired" || status === "paused") {
      return "CANCELED";
    }
  }
  return "ACTIVE";
}

export function mapCreemEventToSubscription(
  event: CreemBillingEvent,
  products = getCreemProductIds()
): CreemSubscriptionMutation | null {
  const object = event.object;
  const product = asRecord(object.product);
  const productId = entityId(object.product);
  if (!productId) return null;

  const plan = planForProduct(productId, products);
  if (!plan) return null;

  const customerId = entityId(object.customer);
  const checkoutSubscription = entityId(object.subscription);
  const subscriptionId =
    event.eventType === "checkout.completed"
      ? checkoutSubscription
      : entityId(object.id);
  const order = asRecord(object.order);
  const amount =
    typeof order?.amountPaid === "number"
      ? order.amountPaid
      : typeof order?.amount_paid === "number"
        ? order.amount_paid
        : typeof order?.amount === "number"
          ? order.amount
          : undefined;
  const scheduledCancel =
    event.eventType === "subscription.scheduled_cancel" ||
    (event.eventType === "subscription.update" &&
      stringValue(object.status) === "scheduled_cancel");
  const revokeImmediately =
    event.eventType === "subscription.expired" ||
    event.eventType === "subscription.paused";

  return {
    userId: metadataUserId(object),
    creemCustomerId: customerId,
    creemSubscriptionId: subscriptionId,
    data: {
      plan,
      status: statusForEvent(event.eventType, object),
      creemCustomerId: customerId,
      creemSubscriptionId: plan === "LIFETIME" ? null : subscriptionId,
      creemProductId: productId,
      interval: intervalForProduct(productId, product, products),
      currentPeriodEnd: revokeImmediately
        ? null
        : dateValue(
            field(object, "currentPeriodEndDate", "current_period_end_date")
          ),
      cancelAtPeriodEnd:
        scheduledCancel || event.eventType === "subscription.canceled",
      ...(amount !== undefined ? { amount } : {}),
      ...(event.eventType === "checkout.completed"
        ? {
            discountApplied: Boolean(
              object.discount || order?.discount || order?.discountAmount
            ),
          }
        : {}),
    },
  };
}
