import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

import { getCreemClient } from "@/lib/creem/client";
import { prisma } from "@/lib/prisma";

export async function cancelRecurringBillingForDeletion(
  userId: string
): Promise<void> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: {
      creemSubscriptionId: true,
      plan: true,
      status: true,
    },
  });
  if (
    !subscription?.creemSubscriptionId ||
    subscription.plan !== SubscriptionPlan.PRO ||
    subscription.status === SubscriptionStatus.CANCELED
  ) {
    return;
  }

  await getCreemClient().subscriptions.cancel(
    subscription.creemSubscriptionId,
    { mode: "immediate" }
  );
  await prisma.subscription.updateMany({
    where: {
      userId,
      creemSubscriptionId: subscription.creemSubscriptionId,
    },
    data: {
      status: SubscriptionStatus.CANCELED,
      cancelAtPeriodEnd: false,
    },
  });
}
