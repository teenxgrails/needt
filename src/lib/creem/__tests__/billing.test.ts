import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

import { getCreemClient } from "@/lib/creem/client";
import { getCreemProductId, isCreemConfigured } from "@/lib/creem/config";
import { mapCreemEventToSubscription } from "@/lib/creem/webhook-mapping";
import { processCreemBillingEvent } from "@/lib/creem/webhook-processor";
import { newDate } from "@/lib/date-utils";
import {
  PLAN_LIMITS,
  effectiveSubscriptionPlan,
  limitStatus,
} from "@/lib/entitlements";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
    subscription: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    creemWebhookEvent: { createMany: jest.fn() },
    user: { findUnique: jest.fn() },
  },
}));

const products = {
  proMonthly: "prod_pro_month",
  proYearly: "prod_pro_year",
  lifetime: "prod_lifetime",
};

describe("Creem checkout selection", () => {
  it("maps each trusted checkout mode to its configured product", () => {
    expect(
      getCreemProductId({ plan: "pro", interval: "month" }, products)
    ).toBe(products.proMonthly);
    expect(getCreemProductId({ plan: "pro", interval: "year" }, products)).toBe(
      products.proYearly
    );
    expect(getCreemProductId({ plan: "lifetime" }, products)).toBe(
      products.lifetime
    );
  });

  it("does not throw at module import when Creem is unconfigured", () => {
    const previousApiKey = process.env.CREEM_API_KEY;
    delete process.env.CREEM_API_KEY;

    expect(isCreemConfigured()).toBe(false);
    expect(() => getCreemClient()).toThrow("Creem is not configured");

    if (previousApiKey) process.env.CREEM_API_KEY = previousApiKey;
  });
});

describe("Creem webhook subscription mapping", () => {
  it("maps a completed Lifetime checkout to an active lifetime plan", () => {
    const mutation = mapCreemEventToSubscription(
      {
        id: "evt_lifetime_checkout",
        createdAt: 1_728_734_325_927,
        eventType: "checkout.completed",
        object: {
          product: { id: products.lifetime },
          customer: { id: "cust_1" },
          metadata: { referenceId: "user_1" },
          order: { amountPaid: 7900 },
        },
      },
      products
    );

    expect(mutation).toMatchObject({
      userId: "user_1",
      creemCustomerId: "cust_1",
      creemSubscriptionId: null,
      data: {
        plan: SubscriptionPlan.LIFETIME,
        status: SubscriptionStatus.ACTIVE,
        creemProductId: products.lifetime,
        interval: null,
        amount: 7900,
      },
    });
  });

  it("maps paid and scheduled-cancel subscription events", () => {
    const active = mapCreemEventToSubscription(
      {
        id: "evt_paid",
        createdAt: 1_728_734_327_355,
        eventType: "subscription.paid",
        object: {
          id: "sub_1",
          product: { id: products.proYearly },
          customer: { id: "cust_1" },
          currentPeriodEndDate: "2099-08-01T00:00:00.000Z",
        },
      },
      products
    );
    const canceling = mapCreemEventToSubscription(
      {
        id: "evt_scheduled_cancel",
        createdAt: 1_728_734_337_932,
        eventType: "subscription.scheduled_cancel",
        object: {
          id: "sub_1",
          product: { id: products.proYearly },
          customer: { id: "cust_1" },
          current_period_end_date: "2099-08-01T00:00:00.000Z",
        },
      },
      products
    );

    expect(active?.data).toMatchObject({
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.ACTIVE,
      interval: "year",
      cancelAtPeriodEnd: false,
    });
    expect(canceling?.data).toMatchObject({
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.ACTIVE,
      interval: "year",
      cancelAtPeriodEnd: true,
    });
  });

  it("rejects webhook products that are not in trusted configuration", () => {
    expect(
      mapCreemEventToSubscription(
        {
          id: "evt_untrusted",
          createdAt: 1_728_734_325_927,
          eventType: "checkout.completed",
          object: {
            product: { id: "prod_from_untrusted_metadata" },
            metadata: { referenceId: "user_1", plan: "LIFETIME" },
          },
        },
        products
      )
    ).toBeNull();
  });

  it("revokes access immediately for paused subscriptions", () => {
    const mutation = mapCreemEventToSubscription(
      {
        id: "evt_paused",
        createdAt: 1_728_734_337_932,
        eventType: "subscription.paused",
        object: {
          id: "sub_1",
          product: { id: products.proMonthly },
          customer: { id: "cust_1" },
          current_period_end_date: "2099-08-01T00:00:00.000Z",
        },
      },
      products
    );

    expect(mutation?.data).toMatchObject({
      status: SubscriptionStatus.CANCELED,
      currentPeriodEnd: null,
    });
  });

  it("distinguishes unpaid from the earlier past-due retry state", () => {
    const mutation = mapCreemEventToSubscription(
      {
        id: "evt_unpaid_update",
        createdAt: 1_728_734_337_932,
        eventType: "subscription.update",
        object: {
          id: "sub_1",
          product: { id: products.proMonthly },
          customer: { id: "cust_1" },
          status: "unpaid",
        },
      },
      products
    );

    expect(mutation?.data.status).toBe(SubscriptionStatus.PAYMENT_FAILED);
  });
});

describe("Creem webhook processing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CREEM_PRODUCT_PRO_MONTHLY = products.proMonthly;
    process.env.CREEM_PRODUCT_PRO_YEARLY = products.proYearly;
    process.env.CREEM_PRODUCT_LIFETIME = products.lifetime;
    (prisma.subscription.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.subscription.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "user_1" });
    (prisma.creemWebhookEvent.createMany as jest.Mock).mockResolvedValue({
      count: 1,
    });
    (prisma.$transaction as jest.Mock).mockImplementation(
      async (operation: (transaction: typeof prisma) => Promise<unknown>) =>
        operation(prisma)
    );
    (prisma.subscription.upsert as jest.Mock).mockResolvedValue({
      userId: "user_1",
      plan: SubscriptionPlan.PRO,
    });
  });

  it("records a webhook once and does not apply a replay twice", async () => {
    const event = {
      id: "evt_paid_replay",
      createdAt: 1_728_734_327_355,
      eventType: "subscription.paid" as const,
      object: {
        id: "sub_1",
        product: { id: products.proMonthly },
        customer: { id: "cust_1" },
        metadata: { referenceId: "user_1" },
      },
    };

    (prisma.creemWebhookEvent.createMany as jest.Mock)
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const first = await processCreemBillingEvent(event);
    const replay = await processCreemBillingEvent(event);

    expect(first.processed).toBe(true);
    expect(replay).toEqual({ processed: false, reason: "replayed_event" });
    expect(prisma.subscription.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user_1" } })
    );
  });

  it("ignores an older active event after a newer cancellation", async () => {
    (prisma.subscription.findFirst as jest.Mock).mockResolvedValue({
      userId: "user_1",
      plan: SubscriptionPlan.PRO,
      lastCreemEventId: "evt_cancel",
      lastCreemEventAt: newDate(1_728_734_337_932),
    });

    const result = await processCreemBillingEvent({
      id: "evt_active_old",
      createdAt: 1_728_734_327_355,
      eventType: "subscription.active",
      object: {
        id: "sub_1",
        product: { id: products.proMonthly },
        customer: { id: "cust_1" },
      },
    });

    expect(result).toEqual({ processed: false, reason: "stale_event" });
    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
    expect(prisma.creemWebhookEvent.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [expect.objectContaining({ outcome: "stale_event" })],
      })
    );
  });

  it("keeps the paid-through date when a retry event omits it", async () => {
    const paidThrough = newDate("2099-08-01T00:00:00.000Z");
    (prisma.subscription.findFirst as jest.Mock).mockResolvedValue({
      userId: "user_1",
      plan: SubscriptionPlan.PRO,
      currentPeriodEnd: paidThrough,
      lastCreemEventId: "evt_active",
      lastCreemEventAt: newDate(1_728_734_327_355),
    });

    await processCreemBillingEvent({
      id: "evt_unpaid",
      createdAt: 1_728_734_337_932,
      eventType: "subscription.unpaid",
      object: {
        id: "sub_1",
        product: { id: products.proMonthly },
        customer: { id: "cust_1" },
        status: "unpaid",
      },
    });

    expect(prisma.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          status: SubscriptionStatus.PAYMENT_FAILED,
          currentPeriodEnd: paidThrough,
        }),
      })
    );
  });

  it("does not downgrade Lifetime when an old Pro event arrives late", async () => {
    (prisma.subscription.findUnique as jest.Mock).mockResolvedValue({
      userId: "user_1",
      plan: SubscriptionPlan.LIFETIME,
    });

    const result = await processCreemBillingEvent({
      id: "evt_old_pro",
      createdAt: 1_728_734_327_355,
      eventType: "subscription.update",
      object: {
        id: "sub_old",
        product: { id: products.proMonthly },
        customer: { id: "cust_1" },
        metadata: { referenceId: "user_1" },
      },
    });

    expect(result).toEqual({
      processed: false,
      reason: "lifetime_preserved",
    });
    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
  });
});

describe("billing entitlements", () => {
  it.each([
    [SubscriptionPlan.FREE, 1, 1, false, true],
    [SubscriptionPlan.PRO, null, 250, true, false],
    [SubscriptionPlan.LIFETIME, null, 250, true, false],
  ] as const)(
    "returns structured limit status for %s",
    (plan, limit, used, allowed, upgradeRequired) => {
      expect(limitStatus(plan, limit, used)).toMatchObject({
        allowed,
        limit,
        used,
        upgradeRequired,
      });
    }
  );

  it("keeps the requested plan matrix in one server-side source", () => {
    expect(PLAN_LIMITS.FREE).toMatchObject({
      calendars: 1,
      autoScheduledTasks: 15,
      boards: 1,
      mailboxes: 0,
      aiAgent: false,
      focusStats: false,
    });
    expect(PLAN_LIMITS.PRO).toEqual(PLAN_LIMITS.LIFETIME);
  });

  it("honors paid access only for active or not-yet-expired periods", () => {
    expect(
      effectiveSubscriptionPlan({
        plan: SubscriptionPlan.PRO,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: null,
      })
    ).toBe(SubscriptionPlan.PRO);
    expect(
      effectiveSubscriptionPlan({
        plan: SubscriptionPlan.PRO,
        status: SubscriptionStatus.CANCELED,
        currentPeriodEnd: newDate("2099-01-01T00:00:00.000Z"),
      })
    ).toBe(SubscriptionPlan.PRO);
    expect(
      effectiveSubscriptionPlan({
        plan: SubscriptionPlan.PRO,
        status: SubscriptionStatus.PAYMENT_FAILED,
        currentPeriodEnd: newDate("2099-01-01T00:00:00.000Z"),
      })
    ).toBe(SubscriptionPlan.PRO);
    expect(
      effectiveSubscriptionPlan({
        plan: SubscriptionPlan.PRO,
        status: SubscriptionStatus.PAST_DUE,
        currentPeriodEnd: newDate("2000-01-01T00:00:00.000Z"),
      })
    ).toBe(SubscriptionPlan.FREE);
  });
});
