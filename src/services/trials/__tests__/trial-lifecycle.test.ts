import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

import { newDate } from "@/lib/date-utils";
import { EmailService } from "@/lib/email/email-service";
import { prisma } from "@/lib/prisma";
import { processTrialLifecycle } from "@/services/trials/trial-lifecycle";

jest.mock("@/lib/email/email-service", () => ({
  EmailService: { sendEmail: jest.fn() },
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    trialGrant: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const expiredGrant = {
  id: "trial-1",
  user: {
    email: "person@example.com",
    emailVerified: newDate("2026-09-01T00:00:00.000Z"),
    subscription: {
      plan: SubscriptionPlan.FREE,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: null,
    },
  },
};

describe("trial lifecycle worker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(prisma.trialGrant.updateMany).mockResolvedValue({ count: 1 });
    jest.mocked(prisma.trialGrant.update).mockResolvedValue({} as never);
    jest.mocked(EmailService.sendEmail).mockResolvedValue({ jobId: "email-1" });
  });

  it("sends the expiry email once after claiming the milestone", async () => {
    jest
      .mocked(prisma.trialGrant.findMany)
      .mockResolvedValueOnce([expiredGrant] as never)
      .mockResolvedValueOnce([]);

    await expect(
      processTrialLifecycle(newDate("2026-09-16T12:00:00.000Z"))
    ).resolves.toEqual({ day11: 0, day14: 1 });
    expect(EmailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "person@example.com",
        subject: "Your Pro trial has ended",
      })
    );
    expect(prisma.trialGrant.update).toHaveBeenCalledWith({
      where: { id: "trial-1" },
      data: { day14SentAt: newDate("2026-09-16T12:00:00.000Z") },
    });
  });

  it("does not email an account that already bought Pro", async () => {
    jest
      .mocked(prisma.trialGrant.findMany)
      .mockResolvedValueOnce([
        {
          ...expiredGrant,
          user: {
            ...expiredGrant.user,
            subscription: {
              plan: SubscriptionPlan.PRO,
              status: SubscriptionStatus.ACTIVE,
              currentPeriodEnd: null,
            },
          },
        },
      ] as never)
      .mockResolvedValueOnce([]);

    await processTrialLifecycle(newDate("2026-09-16T12:00:00.000Z"));
    expect(EmailService.sendEmail).not.toHaveBeenCalled();
  });

  it("advances past a full skipped batch to an eligible grant", async () => {
    const skipped = Array.from({ length: 100 }, (_, index) => ({
      ...expiredGrant,
      id: `skipped-${index}`,
      user: { ...expiredGrant.user, emailVerified: null },
    }));
    jest
      .mocked(prisma.trialGrant.findMany)
      .mockResolvedValueOnce(skipped as never)
      .mockResolvedValueOnce([expiredGrant] as never)
      .mockResolvedValueOnce([]);

    await expect(
      processTrialLifecycle(newDate("2026-09-16T12:00:00.000Z"))
    ).resolves.toEqual({ day11: 0, day14: 1 });
    expect(EmailService.sendEmail).toHaveBeenCalledTimes(1);
    expect(EmailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "person@example.com" })
    );
  });
});
