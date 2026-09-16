import { NextRequest } from "next/server";

import { POST } from "@/app/api/booking-pages/route";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/auth/api-auth", () => ({
  authenticateRequest: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    bookingPage: { create: jest.fn() },
  },
}));

describe("booking page email-verification boundary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(authenticateRequest).mockResolvedValue({ userId: "user-1" });
  });

  it("rejects an unverified owner before publishing through the API", async () => {
    jest.mocked(prisma.user.findUnique).mockResolvedValue({
      emailVerified: null,
    } as never);
    const response = await POST(
      new NextRequest("http://localhost/api/booking-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Intro", slug: "intro-call" }),
      })
    );
    if (!response) throw new Error("Expected booking API response");

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: "Confirm your email to publish",
      code: "EMAIL_VERIFICATION_REQUIRED",
    });
    expect(prisma.bookingPage.create).not.toHaveBeenCalled();
  });
});
