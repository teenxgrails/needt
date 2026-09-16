import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

import {
  LIFETIME_BUYER_CAP,
  reserveLifetimeCheckout,
} from "@/lib/creem/lifetime-cap";
import { prisma } from "@/lib/prisma";

const describeIntegration =
  process.env.LIFETIME_CAP_INTEGRATION === "1" ? describe : describe.skip;
const USER_PREFIX = "lifetime-cap-integration-";

describeIntegration("Lifetime checkout capacity with PostgreSQL", () => {
  let seededBuyerCount = 0;

  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: { id: { startsWith: USER_PREFIX } },
    });
    const [existingBuyers, existingHolds] = await Promise.all([
      prisma.subscription.count({
        where: {
          plan: SubscriptionPlan.LIFETIME,
          userId: { not: { startsWith: USER_PREFIX } },
        },
      }),
      prisma.lifetimeHold.count({
        where: {
          status: { in: ["CREATING", "PENDING"] },
          userId: { not: { startsWith: USER_PREFIX } },
        },
      }),
    ]);
    seededBuyerCount = LIFETIME_BUYER_CAP - 1 - existingBuyers - existingHolds;
    if (seededBuyerCount < 0) {
      throw new Error("Lifetime capacity fixture is already full.");
    }
    await prisma.user.createMany({
      data: Array.from({ length: seededBuyerCount + 2 }, (_, index) => ({
        id: `${USER_PREFIX}${index + 1}`,
        email: `${USER_PREFIX}${index + 1}@example.test`,
      })),
    });
    await prisma.subscription.createMany({
      data: Array.from({ length: seededBuyerCount }, (_, index) => ({
        userId: `${USER_PREFIX}${index + 1}`,
        plan: SubscriptionPlan.LIFETIME,
        status: SubscriptionStatus.ACTIVE,
      })),
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { id: { startsWith: USER_PREFIX } },
    });
  });

  it("admits exactly one of two simultaneous buyers for the last slot", async () => {
    const results = await Promise.all([
      reserveLifetimeCheckout(`${USER_PREFIX}${seededBuyerCount + 1}`),
      reserveLifetimeCheckout(`${USER_PREFIX}${seededBuyerCount + 2}`),
    ]);

    expect(results.map((result) => result.outcome).sort()).toEqual([
      "closed",
      "reserved",
    ]);
    const [buyers, holds] = await Promise.all([
      prisma.subscription.count({
        where: { plan: SubscriptionPlan.LIFETIME },
      }),
      prisma.lifetimeHold.count({
        where: { status: { in: ["CREATING", "PENDING"] } },
      }),
    ]);
    expect(buyers + holds).toBe(LIFETIME_BUYER_CAP);
  });
});
