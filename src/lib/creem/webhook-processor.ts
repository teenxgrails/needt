import { mapCreemEventToSubscription } from "@/lib/creem/webhook-mapping";
import { prisma } from "@/lib/prisma";

import type { CreemBillingEvent } from "./webhook-mapping";

export async function processCreemBillingEvent(event: CreemBillingEvent) {
  const mutation = mapCreemEventToSubscription(event);
  if (!mutation) {
    return { processed: false, reason: "unknown_product" as const };
  }

  const existing =
    mutation.creemSubscriptionId || mutation.creemCustomerId
      ? await prisma.subscription.findFirst({
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
          select: { userId: true, plan: true },
        })
      : null;
  const userId = existing?.userId || mutation.userId;
  if (!userId) {
    return { processed: false, reason: "missing_user" as const };
  }

  const currentSubscription =
    existing ??
    (await prisma.subscription.findUnique({
      where: { userId },
      select: { userId: true, plan: true },
    }));
  if (
    currentSubscription?.plan === "LIFETIME" &&
    mutation.data.plan !== "LIFETIME"
  ) {
    return { processed: false, reason: "lifetime_preserved" as const };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) {
    return { processed: false, reason: "missing_user" as const };
  }

  const subscription = await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      ...mutation.data,
    },
    update: mutation.data,
  });

  return { processed: true, subscription };
}
