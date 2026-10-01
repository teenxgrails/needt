import { NextRequest, NextResponse } from "next/server";

import { getHostedAiUsage } from "@/services/ai/usage";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { isCreemConfigured } from "@/lib/creem/config";
import {
  canAddCalendar,
  canAddMailbox,
  canAutoScheduleMore,
  canCreateBoard,
  canUseAiAgent,
  canViewFocusStats,
  getPlan,
} from "@/lib/entitlements";
import { newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "BillingAPI";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) return auth.response;

    const [
      subscription,
      trialGrant,
      plan,
      calendars,
      autoScheduledTasks,
      boards,
      mailboxes,
      aiAgent,
      focusStats,
      aiUsage,
    ] = await Promise.all([
      prisma.subscription.findUnique({
        where: { userId: auth.userId },
        select: {
          plan: true,
          status: true,
          interval: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          creemCustomerId: true,
        },
      }),
      prisma.trialGrant.findUnique({
        where: { userId: auth.userId },
        select: { startedAt: true, endsAt: true },
      }),
      getPlan(auth.userId),
      canAddCalendar(auth.userId),
      canAutoScheduleMore(auth.userId),
      canCreateBoard(auth.userId),
      canAddMailbox(auth.userId),
      canUseAiAgent(auth.userId),
      canViewFocusStats(auth.userId),
      getHostedAiUsage(auth.userId),
    ]);

    return NextResponse.json({
      configured: isCreemConfigured(),
      plan,
      isTrial:
        plan === "PRO" &&
        Boolean(trialGrant?.endsAt && trialGrant.endsAt > newDate()) &&
        subscription?.plan !== "PRO" &&
        subscription?.plan !== "LIFETIME",
      trialEndsAt: trialGrant?.endsAt ?? null,
      status: subscription?.status ?? "ACTIVE",
      interval: subscription?.interval ?? null,
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
      canManageBilling: Boolean(subscription?.creemCustomerId),
      usage: {
        calendars,
        autoScheduledTasks,
        boards,
        mailboxes,
        aiAgent,
        focusStats,
        aiActions: aiUsage,
      },
    });
  } catch (error) {
    logger.error(
      "Failed to load billing summary",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to load billing summary" },
      { status: 500 }
    );
  }
}
