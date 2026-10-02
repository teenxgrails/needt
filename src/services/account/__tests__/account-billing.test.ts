import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

import { getCreemClient } from "@/lib/creem/client";
import { prisma } from "@/lib/prisma";

import { cancelRecurringBillingForDeletion } from "../account-billing";

jest.mock("@/lib/creem/client", () => ({ getCreemClient: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

describe("account deletion billing", () => {
  const cancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getCreemClient).mockReturnValue({
      subscriptions: { cancel },
    } as never);
    jest.mocked(prisma.subscription.updateMany).mockResolvedValue({ count: 1 });
  });

  it("cancels recurring Creem billing before local account erasure", async () => {
    jest.mocked(prisma.subscription.findUnique).mockResolvedValue({
      creemSubscriptionId: "sub_delete",
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.ACTIVE,
    } as never);
    cancel.mockResolvedValue({});

    await cancelRecurringBillingForDeletion("user-1");

    expect(cancel).toHaveBeenCalledWith("sub_delete", { mode: "immediate" });
    expect(prisma.subscription.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", creemSubscriptionId: "sub_delete" },
      data: {
        status: SubscriptionStatus.CANCELED,
        cancelAtPeriodEnd: false,
      },
    });
  });

  it("does not call Creem for free or lifetime accounts", async () => {
    jest.mocked(prisma.subscription.findUnique).mockResolvedValue({
      creemSubscriptionId: null,
      plan: SubscriptionPlan.LIFETIME,
      status: SubscriptionStatus.ACTIVE,
    } as never);

    await cancelRecurringBillingForDeletion("user-1");

    expect(cancel).not.toHaveBeenCalled();
  });
});
