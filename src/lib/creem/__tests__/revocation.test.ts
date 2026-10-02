import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

import {
  mapCreemRevocationEvent,
  processCreemRevocationEvent,
} from "@/lib/creem/revocation";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/logger", () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
    subscription: { findFirst: jest.fn(), update: jest.fn() },
    creemWebhookEvent: { createMany: jest.fn() },
  },
}));

const tx = {
  subscription: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  creemWebhookEvent: { createMany: jest.fn() },
};

// Creem sends `subscription`, `order` and `customer` expanded or as a bare id.
function refundEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_refund_1",
    createdAt: 1_790_000_000_000,
    eventType: "refund.created" as const,
    object: {
      id: "ref_1",
      object: "refund",
      status: "succeeded",
      refund_amount: 14_900,
      refund_currency: "USD",
      reason: "requested_by_customer",
      transaction: { id: "tx_1", amount: 14_900 },
      order: { id: "ord_1", amount: 14_900 },
      subscription: { id: "sub_1", product: "prod_lifetime" },
      customer: { id: "cust_1" },
      ...overrides,
    },
  };
}

function disputeEvent() {
  return {
    id: "evt_dispute_1",
    createdAt: 1_790_000_100_000,
    eventType: "dispute.created" as const,
    object: {
      id: "dsp_1",
      object: "dispute",
      amount: 700,
      currency: "USD",
      transaction: { id: "tx_2", amount: 700 },
      order: "ord_2",
      subscription: "sub_2",
      customer: "cust_2",
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.$transaction as jest.Mock).mockImplementation(
    async (fn: (client: typeof tx) => unknown) => fn(tx)
  );
  tx.creemWebhookEvent.createMany.mockResolvedValue({ count: 1 });
  tx.subscription.update.mockResolvedValue({});
});

describe("mapping a Creem revocation", () => {
  it("reads references that arrive expanded", () => {
    expect(mapCreemRevocationEvent(refundEvent())).toMatchObject({
      kind: "refund",
      creemSubscriptionId: "sub_1",
      creemCustomerId: "cust_1",
      returnedAmount: 14_900,
      paidAmount: 14_900,
    });
  });

  it("reads references that arrive as bare ids", () => {
    expect(mapCreemRevocationEvent(disputeEvent())).toMatchObject({
      kind: "dispute",
      creemSubscriptionId: "sub_2",
      creemCustomerId: "cust_2",
      returnedAmount: 700,
      // `order` is a bare id here, so the paid amount comes off the transaction.
      paidAmount: 700,
    });
  });

  it("refuses an event that names neither a subscription nor a customer", () => {
    expect(
      mapCreemRevocationEvent(
        refundEvent({ subscription: undefined, customer: undefined })
      )
    ).toBeNull();
  });
});

describe("processing a Creem revocation", () => {
  it("drops a refunded buyer to FREE immediately", async () => {
    tx.subscription.findFirst.mockResolvedValue({
      id: "row_1",
      userId: "user_1",
      plan: SubscriptionPlan.LIFETIME,
    });

    await expect(processCreemRevocationEvent(refundEvent())).resolves.toEqual({
      processed: true,
      outcome: "revoked",
    });
    expect(tx.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "row_1" },
        data: expect.objectContaining({
          plan: SubscriptionPlan.FREE,
          status: SubscriptionStatus.CANCELED,
          currentPeriodEnd: null,
        }),
      })
    );
  });

  it("drops a disputed buyer to FREE", async () => {
    tx.subscription.findFirst.mockResolvedValue({
      id: "row_2",
      userId: "user_2",
      plan: SubscriptionPlan.PRO,
    });

    await expect(processCreemRevocationEvent(disputeEvent())).resolves.toEqual({
      processed: true,
      outcome: "revoked",
    });
  });

  it("keeps access when only part of the payment came back", async () => {
    tx.subscription.findFirst.mockResolvedValue({
      id: "row_3",
      userId: "user_3",
      plan: SubscriptionPlan.PRO,
    });

    await expect(
      processCreemRevocationEvent(refundEvent({ refund_amount: 500 }))
    ).resolves.toEqual({
      processed: false,
      outcome: "partial_refund_retained",
    });
    expect(tx.subscription.update).not.toHaveBeenCalled();
  });

  it("revokes when the event does not say what was originally paid", async () => {
    tx.subscription.findFirst.mockResolvedValue({
      id: "row_4",
      userId: "user_4",
      plan: SubscriptionPlan.PRO,
    });

    await expect(
      processCreemRevocationEvent(
        refundEvent({ order: "ord_1", transaction: { id: "tx_1" } })
      )
    ).resolves.toEqual({ processed: true, outcome: "revoked" });
  });

  it("records the receipt once and ignores the replay", async () => {
    tx.subscription.findFirst.mockResolvedValue({
      id: "row_5",
      userId: "user_5",
      plan: SubscriptionPlan.PRO,
    });
    tx.creemWebhookEvent.createMany.mockResolvedValue({ count: 0 });

    await expect(processCreemRevocationEvent(refundEvent())).resolves.toEqual({
      processed: false,
      outcome: "replayed_event",
    });
    expect(tx.subscription.update).not.toHaveBeenCalled();
  });

  it("does nothing when no subscription of ours matches", async () => {
    tx.subscription.findFirst.mockResolvedValue(null);

    await expect(processCreemRevocationEvent(refundEvent())).resolves.toEqual({
      processed: false,
      outcome: "missing_subscription",
    });
    expect(tx.creemWebhookEvent.createMany).not.toHaveBeenCalled();
  });
});
