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

  it.each([
    ["scheduled cancel", SubscriptionStatus.ACTIVE, true, true],
    ["past due", SubscriptionStatus.PAST_DUE, false, true],
    ["unpaid", SubscriptionStatus.PAYMENT_FAILED, false, true],
    ["canceled", SubscriptionStatus.CANCELED, true, true],
    ["expired", SubscriptionStatus.CANCELED, false, false],
  ])(
    "does not weaken %s at the same provider timestamp",
    async (label, status, cancelAtPeriodEnd, hasPaidThroughDate) => {
      const eventCreatedAt = 1_728_734_337_932;
      (prisma.subscription.findFirst as jest.Mock).mockResolvedValue({
        userId: "user_1",
        plan: SubscriptionPlan.PRO,
        status,
        creemSubscriptionId: "sub_1",
        currentPeriodEnd: hasPaidThroughDate
          ? newDate("2099-08-01T00:00:00.000Z")
          : null,
        cancelAtPeriodEnd,
        lastCreemEventId: `evt_${label}`,
        lastCreemEventAt: newDate(eventCreatedAt),
      });

      for (const eventType of [
        "subscription.active",
        "subscription.paid",
      ] as const) {
        const result = await processCreemBillingEvent({
          id: `evt_equal_${eventType}_${label}`,
          createdAt: eventCreatedAt,
          eventType,
          object: {
            id: "sub_1",
            product: { id: products.proMonthly },
            customer: { id: "cust_1" },
          },
        });

        expect(result).toEqual({
          processed: false,
          reason: "equal_time_weaker_event",
        });
      }

      expect(prisma.subscription.upsert).not.toHaveBeenCalled();
      expect(prisma.creemWebhookEvent.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            expect.objectContaining({ outcome: "equal_time_weaker_event" }),
          ],
        })
      );
    }
  );

  it("allows a more restrictive event at the same provider timestamp", async () => {
    const eventCreatedAt = 1_728_734_337_932;
    (prisma.subscription.findFirst as jest.Mock).mockResolvedValue({
      userId: "user_1",
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.PAST_DUE,
      creemSubscriptionId: "sub_1",
      currentPeriodEnd: newDate("2099-08-01T00:00:00.000Z"),
      cancelAtPeriodEnd: false,
      lastCreemEventId: "evt_past_due",
      lastCreemEventAt: newDate(eventCreatedAt),
    });

    const result = await processCreemBillingEvent({
      id: "evt_equal_expired",
      createdAt: eventCreatedAt,
      eventType: "subscription.expired",
      object: {
        id: "sub_1",
        product: { id: products.proMonthly },
        customer: { id: "cust_1" },
      },
    });

    expect(result.processed).toBe(true);
    expect(prisma.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          status: SubscriptionStatus.CANCELED,
          currentPeriodEnd: null,
        }),
      })
    );
  });

  it("allows an equal-time resubscribe with a new subscription id", async () => {
    const eventCreatedAt = 1_728_734_337_932;
    (prisma.subscription.findFirst as jest.Mock).mockResolvedValue({
      userId: "user_1",
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.CANCELED,
      creemSubscriptionId: "sub_old",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      lastCreemEventId: "evt_expired",
      lastCreemEventAt: newDate(eventCreatedAt),
    });

    const result = await processCreemBillingEvent({
      id: "evt_equal_resubscribe",
      createdAt: eventCreatedAt,
      eventType: "subscription.active",
      object: {
        id: "sub_new",
        product: { id: products.proMonthly },
        customer: { id: "cust_1" },
      },
    });

    expect(result.processed).toBe(true);
    expect(prisma.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          status: SubscriptionStatus.ACTIVE,
          creemSubscriptionId: "sub_new",
        }),
      })
    );
  });

  it("ignores a later restrictive event from the old subscription after resubscribe", async () => {
    const eventCreatedAt = 1_728_734_337_932;
    (prisma.subscription.findFirst as jest.Mock).mockResolvedValue({
      userId: "user_1",
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.ACTIVE,
      creemSubscriptionId: "sub_new",
      currentPeriodEnd: newDate("2099-08-01T00:00:00.000Z"),
      cancelAtPeriodEnd: false,
      lastCreemEventId: "evt_resubscribed",
      lastCreemEventAt: newDate(eventCreatedAt),
    });

    const result = await processCreemBillingEvent({
      id: "evt_later_old_expired",
      createdAt: eventCreatedAt + 1_000,
      eventType: "subscription.expired",
      object: {
        id: "sub_old",
        product: { id: products.proMonthly },
        customer: { id: "cust_1" },
      },
    });

    expect(result).toEqual({
      processed: false,
      reason: "subscription_identity_mismatch",
    });
    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
    expect(prisma.creemWebhookEvent.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            outcome: "subscription_identity_mismatch",
          }),
        ],
      })
    );
  });

  it("allows a newer access grant to establish a new subscription id", async () => {
    const eventCreatedAt = 1_728_734_337_932;
    (prisma.subscription.findFirst as jest.Mock).mockResolvedValue({
      userId: "user_1",
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.ACTIVE,
      creemSubscriptionId: "sub_old",
      currentPeriodEnd: newDate("2099-08-01T00:00:00.000Z"),
      cancelAtPeriodEnd: false,
      lastCreemEventId: "evt_resubscribed",
      lastCreemEventAt: newDate(eventCreatedAt),
    });

    const result = await processCreemBillingEvent({
      id: "evt_new_active",
      createdAt: eventCreatedAt + 1_000,
      eventType: "subscription.active",
      object: {
        id: "sub_new",
        product: { id: products.proMonthly },
        customer: { id: "cust_1" },
      },
    });

    expect(result.processed).toBe(true);
    expect(prisma.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          status: SubscriptionStatus.ACTIVE,
          creemSubscriptionId: "sub_new",
        }),
      })
    );
  });

  it("preserves an active subscription against an equal-time grant with another id", async () => {
    const eventCreatedAt = 1_728_734_337_932;
    (prisma.subscription.findFirst as jest.Mock).mockResolvedValue({
      userId: "user_1",
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.ACTIVE,
      creemSubscriptionId: "sub_new",
      currentPeriodEnd: newDate("2099-08-01T00:00:00.000Z"),
      cancelAtPeriodEnd: false,
      lastCreemEventId: "evt_resubscribed",
      lastCreemEventAt: newDate(eventCreatedAt),
    });

    const result = await processCreemBillingEvent({
      id: "evt_equal_other_active",
      createdAt: eventCreatedAt,
      eventType: "subscription.active",
      object: {
        id: "sub_other",
        product: { id: products.proMonthly },
        customer: { id: "cust_1" },
      },
    });

    expect(result).toEqual({
      processed: false,
      reason: "subscription_identity_mismatch",
    });
    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
  });

  it.each([
    ["subscription.past_due", SubscriptionStatus.PAST_DUE],
    ["subscription.unpaid", SubscriptionStatus.PAYMENT_FAILED],
    ["subscription.canceled", SubscriptionStatus.CANCELED],
    ["subscription.scheduled_cancel", SubscriptionStatus.ACTIVE],
  ] as const)(
    "keeps the paid-through date when %s omits it",
    async (eventType, expectedStatus) => {
      const paidThrough = newDate("2099-08-01T00:00:00.000Z");
      (prisma.subscription.findFirst as jest.Mock).mockResolvedValue({
        userId: "user_1",
        plan: SubscriptionPlan.PRO,
        status: SubscriptionStatus.ACTIVE,
        creemSubscriptionId: "sub_1",
        currentPeriodEnd: paidThrough,
        cancelAtPeriodEnd: false,
        lastCreemEventId: "evt_active",
        lastCreemEventAt: newDate(1_728_734_327_355),
      });

      await processCreemBillingEvent({
        id: `evt_without_period_${eventType}`,
        createdAt: 1_728_734_337_932,
        eventType,
        object: {
          id: "sub_1",
          product: { id: products.proMonthly },
          customer: { id: "cust_1" },
        },
      });

      expect(prisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            status: expectedStatus,
            currentPeriodEnd: paidThrough,
          }),
        })
      );
    }
  );

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

  it.each([
    ["subscription.expired", undefined],
    ["subscription.paused", undefined],
    ["subscription.update", "canceled"],
  ] as const)(
    "preserves Lifetime for a Lifetime-product %s event",
    async (eventType, status) => {
      (prisma.subscription.findFirst as jest.Mock).mockResolvedValue({
        userId: "user_1",
        plan: SubscriptionPlan.LIFETIME,
        status: SubscriptionStatus.ACTIVE,
        creemSubscriptionId: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        lastCreemEventId: "evt_lifetime_checkout",
        lastCreemEventAt: newDate(1_728_734_327_355),
      });

      const result = await processCreemBillingEvent({
        id: `evt_lifetime_${eventType}`,
        createdAt: 1_728_734_337_932,
        eventType,
        object: {
          id: "sub_lifetime_stray",
          product: { id: products.lifetime },
          customer: { id: "cust_lifetime" },
          ...(status ? { status } : {}),
        },
      });

      expect(result).toEqual({
        processed: false,
        reason: "lifetime_preserved",
      });
      expect(prisma.subscription.upsert).not.toHaveBeenCalled();
    }
  );

  it("restores a paused subscription when Creem reports it active again", async () => {
    (prisma.subscription.findFirst as jest.Mock).mockResolvedValue({
      userId: "user_1",
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.CANCELED,
      creemSubscriptionId: "sub_1",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      lastCreemEventId: "evt_paused",
      lastCreemEventAt: newDate(1_728_734_327_355),
    });

    const result = await processCreemBillingEvent({
      id: "evt_resumed",
      createdAt: 1_728_734_337_932,
      eventType: "subscription.update",
      object: {
        id: "sub_1",
        product: { id: products.proMonthly },
        customer: { id: "cust_1" },
        status: "active",
        current_period_end_date: "2099-08-01T00:00:00.000Z",
      },
    });

    expect(result.processed).toBe(true);
    expect(prisma.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: newDate("2099-08-01T00:00:00.000Z"),
        }),
      })
    );
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
