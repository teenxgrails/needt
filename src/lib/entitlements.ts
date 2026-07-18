import {
  type MailProvider,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@prisma/client";

import { endOfMonth, newDate, startOfMonth } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";

export const PLAN_LIMITS = {
  FREE: {
    calendars: 1,
    autoScheduledTasks: 15,
    boards: 1,
    mailboxes: 0,
    aiAgent: false,
    focusStats: false,
  },
  PRO: {
    calendars: null,
    autoScheduledTasks: null,
    boards: null,
    mailboxes: 3,
    aiAgent: true,
    focusStats: true,
  },
  LIFETIME: {
    calendars: null,
    autoScheduledTasks: null,
    boards: null,
    mailboxes: 3,
    aiAgent: true,
    focusStats: true,
  },
} as const satisfies Record<
  SubscriptionPlan,
  {
    calendars: number | null;
    autoScheduledTasks: number | null;
    boards: number | null;
    mailboxes: number | null;
    aiAgent: boolean;
    focusStats: boolean;
  }
>;

export type LimitStatus = {
  allowed: boolean;
  limit: number | null;
  used: number;
  remaining: number | null;
  upgradeRequired: boolean;
  plan: SubscriptionPlan;
};

export function limitStatus(
  plan: SubscriptionPlan,
  limit: number | null,
  used: number
): LimitStatus {
  const normalizedUsed = Math.max(0, used);
  const allowed = limit === null || normalizedUsed < limit;
  return {
    allowed,
    limit,
    used: normalizedUsed,
    remaining: limit === null ? null : Math.max(0, limit - normalizedUsed),
    upgradeRequired: !allowed && plan === SubscriptionPlan.FREE,
    plan,
  };
}

export function effectiveSubscriptionPlan(
  subscription: {
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    currentPeriodEnd: Date | null;
  } | null
): SubscriptionPlan {
  if (!subscription || subscription.plan === SubscriptionPlan.FREE) {
    return SubscriptionPlan.FREE;
  }
  if (subscription.status === SubscriptionStatus.ACTIVE) {
    return subscription.plan;
  }
  if (
    (subscription.status === SubscriptionStatus.CANCELED ||
      subscription.status === SubscriptionStatus.PAST_DUE) &&
    subscription.currentPeriodEnd &&
    subscription.currentPeriodEnd > newDate()
  ) {
    return subscription.plan;
  }
  return SubscriptionPlan.FREE;
}

export async function getPlan(userId: string): Promise<SubscriptionPlan> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true, status: true, currentPeriodEnd: true },
  });
  return effectiveSubscriptionPlan(subscription);
}

export async function canCreateBoard(userId: string): Promise<LimitStatus> {
  const [plan, used] = await Promise.all([
    getPlan(userId),
    prisma.board.count({ where: { userId } }),
  ]);
  return limitStatus(plan, PLAN_LIMITS[plan].boards, used);
}

export async function canAutoScheduleMore(
  userId: string
): Promise<LimitStatus> {
  const now = newDate();
  const [plan, used] = await Promise.all([
    getPlan(userId),
    prisma.task.count({
      where: {
        userId,
        lastScheduled: {
          gte: startOfMonth(now),
          lte: endOfMonth(now),
        },
        OR: [{ isAutoScheduled: true }, { autoScheduled: true }],
      },
    }),
  ]);
  return limitStatus(plan, PLAN_LIMITS[plan].autoScheduledTasks, used);
}

export async function canAddMailbox(
  userId: string,
  existingIdentity?: { provider: MailProvider; address: string }
): Promise<LimitStatus> {
  const [plan, used, existing] = await Promise.all([
    getPlan(userId),
    prisma.mailAccount.count({ where: { userId } }),
    existingIdentity
      ? prisma.mailAccount.findUnique({
          where: {
            userId_provider_address: {
              userId,
              provider: existingIdentity.provider,
              address: existingIdentity.address,
            },
          },
          select: { id: true },
        })
      : null,
  ]);
  const status = limitStatus(plan, PLAN_LIMITS[plan].mailboxes, used);
  return existing
    ? { ...status, allowed: true, upgradeRequired: false }
    : status;
}

export async function canAddCalendar(userId: string): Promise<LimitStatus> {
  const [plan, used] = await Promise.all([
    getPlan(userId),
    prisma.connectedAccount.count({ where: { userId } }),
  ]);
  return limitStatus(plan, PLAN_LIMITS[plan].calendars, used);
}

export async function canUseAiAgent(userId: string) {
  const plan = await getPlan(userId);
  return {
    allowed: PLAN_LIMITS[plan].aiAgent,
    limit: PLAN_LIMITS[plan].aiAgent ? 1 : 0,
    used: PLAN_LIMITS[plan].aiAgent ? 1 : 0,
    upgradeRequired: !PLAN_LIMITS[plan].aiAgent,
    plan,
  };
}

export async function canViewFocusStats(userId: string) {
  const plan = await getPlan(userId);
  return {
    allowed: PLAN_LIMITS[plan].focusStats,
    limit: PLAN_LIMITS[plan].focusStats ? 1 : 0,
    used: PLAN_LIMITS[plan].focusStats ? 1 : 0,
    upgradeRequired: !PLAN_LIMITS[plan].focusStats,
    plan,
  };
}
