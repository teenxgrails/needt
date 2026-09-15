import { NextRequest } from "next/server";

import { POST } from "@/app/api/billing/portal/route";

import { getCreemClient } from "@/lib/creem/client";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/auth/api-auth", () => ({
  authenticateRequest: jest.fn().mockResolvedValue({ userId: "user_1" }),
}));
jest.mock("@/lib/creem/client", () => ({ getCreemClient: jest.fn() }));
jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.mock("@/lib/prisma", () => ({
  prisma: { subscription: { findUnique: jest.fn() } },
}));
jest.mock("@/lib/security/rate-limit", () => ({
  accountRule: jest.fn(),
  enforceRateLimits: jest.fn().mockResolvedValue(null),
  ipRule: jest.fn(),
}));

describe("Creem customer portal route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CREEM_API_KEY = "creem_test_key";
  });

  it("requests a portal link only for the authenticated user's stored customer", async () => {
    const generateBillingLinks = jest.fn().mockResolvedValue({
      customerPortalLink: "https://creem.test/customer/cust_1",
    });
    (getCreemClient as jest.Mock).mockReturnValue({
      customers: { generateBillingLinks },
    });
    (prisma.subscription.findUnique as jest.Mock).mockResolvedValue({
      creemCustomerId: "cust_1",
    });

    const response = await POST(
      new NextRequest("http://localhost/api/billing/portal", {
        method: "POST",
      })
    );

    expect(response).toBeDefined();
    expect(response!.status).toBe(200);
    expect(await response!.json()).toEqual({
      url: "https://creem.test/customer/cust_1",
    });
    expect(prisma.subscription.findUnique).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      select: { creemCustomerId: true },
    });
    expect(generateBillingLinks).toHaveBeenCalledWith({
      customerId: "cust_1",
    });
  });
});
