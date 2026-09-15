import {
  Prisma,
  SubscriptionPlan,
  type SubscriptionStatus,
} from "@prisma/client";

import { mapCreemEventToSubscription } from "@/lib/creem/webhook-mapping";
import { newDate } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";

import type { CreemBillingEvent } from "./webhook-mapping";

const SERIALIZABLE_RETRIES = 3;

type SubscriptionState = {
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};

function restrictionLevel(state: SubscriptionState) {
  if (state.status === "CANCELED") {
    return state.currentPeriodEnd ? 4 : 5;
  }
  if (state.status === "PAYMENT_FAILED") return 3;
  if (state.status === "PAST_DUE") return 2;
  return state.cancelAtPeriodEnd ? 1 : 0;
}

function isRetryableTransaction(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2034"
  );
}

async function serializableTransaction<T>(
  operation: (transaction: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  for (let attempt = 0; attempt < SERIALIZABLE_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        !isRetryableTransaction(error) ||
        attempt === SERIALIZABLE_RETRIES - 1
      ) {
        throw error;
      }
    }
  }
  throw new Error("Serializable Creem webhook retry limit reached.");
}

export async function processCreemBillingEvent(event: CreemBillingEvent) {
  const eventId = event.id.trim();
  const eventCreatedAt = newDate(event.createdAt);
  if (!eventId || Number.isNaN(eventCreatedAt.getTime())) {
    return { processed: false, reason: "invalid_event" as const };
  }

  const mutation = mapCreemEventToSubscription(event);
  if (!mutation) {
    return { processed: false, reason: "unknown_product" as const };
  }

  return serializableTransaction(async (transaction) => {
    const existing =
      mutation.creemSubscriptionId || mutation.creemCustomerId
        ? await transaction.subscription.findFirst({
            where: {
              OR: [
                ...(mutation.creemSubscriptionId
                  ? [{ creemSubscriptionId: mutation.creemSubscriptionId }]
                  : []),
                ...(mutation.creemCustomerId
                  ? [{ creemCustomerId: mutation.creemCustomerId }]
                  : []),
              ],
            },
            select: {
              userId: true,
              plan: true,
              status: true,
              creemSubscriptionId: true,
              currentPeriodEnd: true,
              cancelAtPeriodEnd: true,
              lastCreemEventId: true,
              lastCreemEventAt: true,
            },
          })
        : null;
    const userId = existing?.userId || mutation.userId;
    if (!userId) {
      return { processed: false, reason: "missing_user" as const };
    }

    const currentSubscription =
      existing ??
      (await transaction.subscription.findUnique({
        where: { userId },
        select: {
          userId: true,
          plan: true,
          status: true,
          creemSubscriptionId: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          lastCreemEventId: true,
          lastCreemEventAt: true,
        },
      }));
    const subscriptionCursor = mutation.creemSubscriptionId
      ? await transaction.creemSubscriptionCursor.findUnique({
          where: {
            userId_creemSubscriptionId: {
              userId,
              creemSubscriptionId: mutation.creemSubscriptionId,
            },
          },
        })
      : null;
    const legacyCurrentCursor =
      !subscriptionCursor &&
      currentSubscription?.creemSubscriptionId ===
        mutation.creemSubscriptionId &&
      currentSubscription.lastCreemEventAt
        ? {
            lastEventAt: currentSubscription.lastCreemEventAt,
            restrictionLevel: restrictionLevel(currentSubscription),
          }
        : null;
    const claimedSubscriptionCursor = subscriptionCursor ?? legacyCurrentCursor;
    const storedSubscriptionCursor = currentSubscription?.creemSubscriptionId
      ? currentSubscription.creemSubscriptionId === mutation.creemSubscriptionId
        ? claimedSubscriptionCursor
        : await transaction.creemSubscriptionCursor.findUnique({
            where: {
              userId_creemSubscriptionId: {
                userId,
                creemSubscriptionId: currentSubscription.creemSubscriptionId,
              },
            },
          })
      : null;
    const olderThanClaimedSubscription = Boolean(
      claimedSubscriptionCursor?.lastEventAt &&
        claimedSubscriptionCursor.lastEventAt > eventCreatedAt
    );
    const sameClaimedSubscriptionTimestamp = Boolean(
      claimedSubscriptionCursor?.lastEventAt &&
        claimedSubscriptionCursor.lastEventAt.getTime() ===
          eventCreatedAt.getTime()
    );
    const weakerAtSameTimestamp = Boolean(
      sameClaimedSubscriptionTimestamp &&
        claimedSubscriptionCursor &&
        restrictionLevel(mutation.data) <
          claimedSubscriptionCursor.restrictionLevel
    );
    const isRecurringMutation =
      mutation.data.plan !== SubscriptionPlan.LIFETIME;
    const missingSubscriptionIdentity = Boolean(
      isRecurringMutation && !mutation.creemSubscriptionId
    );
    const differentSubscriptionId = Boolean(
      isRecurringMutation &&
        currentSubscription &&
        currentSubscription.creemSubscriptionId !== mutation.creemSubscriptionId
    );
    const incomingGrantsAccess = restrictionLevel(mutation.data) === 0;
    const storedSubscriptionIdentityEnded = Boolean(
      !currentSubscription?.creemSubscriptionId ||
        storedSubscriptionCursor?.restrictionLevel === 5
    );
    const canEstablishSubscriptionIdentity = Boolean(
      mutation.creemSubscriptionId &&
        incomingGrantsAccess &&
        storedSubscriptionIdentityEnded
    );
    const blockedSubscriptionIdentity = Boolean(
      differentSubscriptionId && !canEstablishSubscriptionIdentity
    );
    const restrictiveEventWithoutEstablishedIdentity = Boolean(
      isRecurringMutation &&
        restrictionLevel(mutation.data) > 0 &&
        currentSubscription?.creemSubscriptionId !==
          mutation.creemSubscriptionId
    );
    const lifetimePreserved = Boolean(currentSubscription?.plan === "LIFETIME");
    const outcome = olderThanClaimedSubscription
      ? "stale_event"
      : weakerAtSameTimestamp
        ? "equal_time_weaker_event"
        : lifetimePreserved
          ? "lifetime_preserved"
          : missingSubscriptionIdentity
            ? "missing_subscription_identity"
            : blockedSubscriptionIdentity ||
                restrictiveEventWithoutEstablishedIdentity
              ? "subscription_identity_mismatch"
              : "processed";

    const user = await transaction.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      return { processed: false, reason: "missing_user" as const };
    }

    const receipt = await transaction.creemWebhookEvent.createMany({
      data: [
        {
          id: eventId,
          userId,
          eventType: event.eventType,
          eventCreatedAt,
          outcome,
        },
      ],
      skipDuplicates: true,
    });
    if (receipt.count === 0) {
      return { processed: false, reason: "replayed_event" as const };
    }
    if (olderThanClaimedSubscription) {
      return { processed: false, reason: "stale_event" as const };
    }
    if (weakerAtSameTimestamp) {
      return { processed: false, reason: "equal_time_weaker_event" as const };
    }
    if (lifetimePreserved) {
      return { processed: false, reason: "lifetime_preserved" as const };
    }
    if (missingSubscriptionIdentity) {
      return {
        processed: false,
        reason: "missing_subscription_identity" as const,
      };
    }
    if (
      blockedSubscriptionIdentity ||
      restrictiveEventWithoutEstablishedIdentity
    ) {
      return {
        processed: false,
        reason: "subscription_identity_mismatch" as const,
      };
    }

    if (mutation.creemSubscriptionId) {
      await transaction.creemSubscriptionCursor.upsert({
        where: {
          userId_creemSubscriptionId: {
            userId,
            creemSubscriptionId: mutation.creemSubscriptionId,
          },
        },
        create: {
          userId,
          creemSubscriptionId: mutation.creemSubscriptionId,
          lastEventId: eventId,
          lastEventAt: eventCreatedAt,
          restrictionLevel: restrictionLevel(mutation.data),
        },
        update: {
          lastEventId: eventId,
          lastEventAt: eventCreatedAt,
          restrictionLevel: restrictionLevel(mutation.data),
        },
      });
    }

    const keepsPaidThroughDate = [
      "subscription.active",
      "subscription.trialing",
      "subscription.paid",
      "subscription.past_due",
      "subscription.unpaid",
      "subscription.canceled",
      "subscription.scheduled_cancel",
      "subscription.update",
    ].includes(event.eventType);
    const subscriptionData =
      keepsPaidThroughDate &&
      !mutation.data.currentPeriodEnd &&
      currentSubscription?.currentPeriodEnd
        ? {
            ...mutation.data,
            currentPeriodEnd: currentSubscription.currentPeriodEnd,
          }
        : mutation.data;

    const subscription = await transaction.subscription.upsert({
      where: { userId },
      create: {
        userId,
        ...subscriptionData,
        lastCreemEventId: eventId,
        lastCreemEventAt: eventCreatedAt,
      },
      update: {
        ...subscriptionData,
        lastCreemEventId: eventId,
        lastCreemEventAt: eventCreatedAt,
      },
    });

    return { processed: true, subscription };
  });
}
