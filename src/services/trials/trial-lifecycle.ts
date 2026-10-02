import { SubscriptionPlan } from "@prisma/client";

import { addCalendarDays, addMinutes, newDate } from "@/lib/date-utils";
import { EmailService } from "@/lib/email/email-service";
import { getTrialEmailTemplate } from "@/lib/email/templates/trial";
import { effectiveSubscriptionPlan } from "@/lib/entitlements";
import { prisma } from "@/lib/prisma";

type Milestone = "day11" | "day14";

const CLAIM_TTL_MINUTES = 15;

function payUrl(): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "http://localhost:3000";
  const url = new URL("/settings", baseUrl);
  url.hash = "billing";
  return url.toString();
}

async function processMilestone(milestone: Milestone, now: Date) {
  const sentField = milestone === "day11" ? "day11SentAt" : "day14SentAt";
  const claimedField =
    milestone === "day11" ? "day11ClaimedAt" : "day14ClaimedAt";
  const staleClaim = addMinutes(now, -CLAIM_TTL_MINUTES);
  let sent = 0;
  while (true) {
    const grants = await prisma.trialGrant.findMany({
      where: {
        userId: { not: null },
        [sentField]: null,
        ...(milestone === "day11"
          ? {
              startedAt: { lte: addCalendarDays(now, -11) },
              endsAt: { gt: now },
            }
          : { endsAt: { lte: now } }),
        OR: [{ [claimedField]: null }, { [claimedField]: { lt: staleClaim } }],
      },
      include: {
        user: {
          select: {
            email: true,
            emailVerified: true,
            subscription: {
              select: { plan: true, status: true, currentPeriodEnd: true },
            },
          },
        },
      },
      take: 100,
      orderBy:
        milestone === "day11" ? { startedAt: "asc" } : { endsAt: "asc" },
    });

    for (const grant of grants) {
      if (!grant.user?.email || !grant.user.emailVerified) {
        await prisma.trialGrant.update({
          where: { id: grant.id },
          data: { [sentField]: now },
        });
        continue;
      }
      if (
        effectiveSubscriptionPlan(grant.user.subscription, null, now) !==
        SubscriptionPlan.FREE
      ) {
        await prisma.trialGrant.update({
          where: { id: grant.id },
          data: { [sentField]: now },
        });
        continue;
      }
      const claim = await prisma.trialGrant.updateMany({
        where: {
          id: grant.id,
          [sentField]: null,
          OR: [
            { [claimedField]: null },
            { [claimedField]: { lt: staleClaim } },
          ],
        },
        data: { [claimedField]: now },
      });
      if (claim.count !== 1) continue;

      const template = getTrialEmailTemplate({
        milestone,
        payUrl: payUrl(),
      });
      await EmailService.sendEmail({
        to: grant.user.email,
        ...template,
      });
      await prisma.trialGrant.update({
        where: { id: grant.id },
        data: { [sentField]: now },
      });
      sent += 1;
    }

    if (grants.length < 100) break;
  }
  return sent;
}

export async function processTrialLifecycle(now = newDate()) {
  const day14 = await processMilestone("day14", now);
  const day11 = await processMilestone("day11", now);
  return { day11, day14 };
}
