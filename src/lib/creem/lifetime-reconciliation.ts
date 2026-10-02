import { getCreemClient } from "@/lib/creem/client";
import { getCreemProductId } from "@/lib/creem/config";
import {
  attachLifetimeCheckout,
  expireLifetimeReservation,
  listReconcilableLifetimeReservations,
  markLifetimeReservationChecked,
} from "@/lib/creem/lifetime-cap";
import { processCreemBillingEvent } from "@/lib/creem/webhook-processor";
import { newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "LifetimeCheckoutReconciliation";

export async function reconcileLifetimeCheckoutReservations() {
  const reservations = await listReconcilableLifetimeReservations();
  if (reservations.length === 0) return;
  const client = getCreemClient();

  for (const reservation of reservations) {
    try {
      const checkout = reservation.creemCheckoutId
        ? await client.checkouts.retrieve(reservation.creemCheckoutId)
        : await retryCreatingCheckout(client, reservation);
      const checkoutId = checkout.id;
      await attachLifetimeCheckout(reservation.id, {
        id: checkoutId,
        checkoutUrl: checkout.checkoutUrl ?? null,
      });
      if (checkout.status === "expired") {
        await expireLifetimeReservation(reservation.id, checkoutId);
        continue;
      }
      if (checkout.status === "completed") {
        const result = await processCreemBillingEvent({
          id: `checkout-reconcile-${checkout.id}`,
          createdAt: newDate().getTime(),
          eventType: "checkout.completed",
          object: checkout as unknown as Record<string, unknown>,
        });
        if (!result.processed && result.reason !== "lifetime_preserved") {
          await logger.warn(
            "Completed Lifetime checkout needs manual review",
            { checkoutId, reason: result.reason ?? "unknown" },
            LOG_SOURCE
          );
        }
        continue;
      }
      await markLifetimeReservationChecked(reservation.id);
    } catch (error) {
      await logger.warn(
        "Could not reconcile Lifetime checkout",
        {
          checkoutId: reservation.creemCheckoutId ?? "not-assigned",
          error: error instanceof Error ? error.message : String(error),
        },
        LOG_SOURCE
      );
    }
  }
}

async function retryCreatingCheckout(
  client: ReturnType<typeof getCreemClient>,
  reservation: Awaited<
    ReturnType<typeof listReconcilableLifetimeReservations>
  >[number]
) {
  const productId = getCreemProductId({ plan: "lifetime" });
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.NEXTAUTH_URL?.trim();
  if (!productId || !appUrl || !reservation.user.email) {
    throw new Error("Lifetime checkout recovery is not configured.");
  }
  const successUrl = new URL("/settings", appUrl);
  successUrl.searchParams.set("billing", "success");
  successUrl.hash = "billing";

  return client.checkouts.create({
    productId,
    requestId: reservation.requestId,
    customer: {
      email: reservation.user.email,
      ...(reservation.user.name ? { name: reservation.user.name } : {}),
    },
    successUrl: successUrl.toString(),
    metadata: {
      referenceId: reservation.user.id,
      userId: reservation.user.id,
      plan: "lifetime",
      interval: "once",
      lifetimeReservationId: reservation.id,
    },
  });
}
