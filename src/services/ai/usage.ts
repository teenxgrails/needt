import { newDate } from "@/lib/date-utils";
import { getPlan } from "@/lib/entitlements";
import { prisma } from "@/lib/prisma";

export const HOSTED_AI_CONFIG = {
  monthlyActionCaps: {
    FREE: 0,
    PRO: Number(process.env.NEEDT_AI_MONTHLY_ACTION_CAP || 300),
    LIFETIME: Number(process.env.NEEDT_AI_LIFETIME_ACTION_CAP || 3_000),
  },
  baseUrl:
    process.env.NEEDT_AI_BASE_URL?.trim() || "https://api.deepseek.com/v1",
  model: process.env.NEEDT_AI_MODEL?.trim() || "deepseek-chat",
} as const;

export function usageMonth(date = newDate()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

export function hostedUsageStatus(
  actionCount: number,
  plan: keyof typeof HOSTED_AI_CONFIG.monthlyActionCaps = "FREE"
) {
  const limit = Math.max(0, HOSTED_AI_CONFIG.monthlyActionCaps[plan]);
  return {
    plan,
    used: Math.max(0, actionCount),
    limit,
    remaining: Math.max(0, limit - actionCount),
    allowed: limit > 0 && actionCount < limit,
  };
}

export function resolveAiAccessMode(input: {
  hasByok: boolean;
  hostedAvailable: boolean;
  hostedAllowed: boolean;
}) {
  if (input.hasByok) return "byok" as const;
  if (input.hostedAvailable && input.hostedAllowed) return "hosted" as const;
  return "none" as const;
}

export async function getHostedAiUsage(userId: string) {
  const [row, plan] = await Promise.all([
    prisma.aiUsage.findUnique({
      where: { userId_yearMonth: { userId, yearMonth: usageMonth() } },
    }),
    getPlan(userId),
  ]);
  return hostedUsageStatus(row?.actionCount ?? 0, plan);
}

export async function canUseHostedAi(userId: string) {
  return (await getHostedAiUsage(userId)).allowed;
}

export async function recordHostedAiAction(userId: string) {
  const yearMonth = usageMonth();
  const [row, plan] = await Promise.all([
    prisma.aiUsage.upsert({
      where: { userId_yearMonth: { userId, yearMonth } },
      create: { userId, yearMonth, actionCount: 1 },
      update: { actionCount: { increment: 1 } },
    }),
    getPlan(userId),
  ]);
  return hostedUsageStatus(row.actionCount, plan);
}
