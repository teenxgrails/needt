import { randomUUID } from "crypto";

import { newDate } from "@/lib/date-utils";
import { getPlan } from "@/lib/entitlements";
import { prisma } from "@/lib/prisma";

export const HOSTED_AI_CONFIG = {
  monthlyActionCaps: {
    FREE: 0,
    PRO: Number(process.env.NEEDT_AI_MONTHLY_ACTION_CAP || 300),
    LIFETIME: Number(process.env.NEEDT_AI_LIFETIME_ACTION_CAP || 3_000),
  },
  ceilingMultiplier: Number(process.env.NEEDT_AI_CEILING_MULTIPLIER || 2),
  baseUrl:
    process.env.NEEDT_AI_BASE_URL?.trim() || "https://api.deepseek.com/v1",
  model: process.env.NEEDT_AI_MODEL?.trim() || "deepseek-chat",
} as const;

export type HostedAiUsageMode = "normal" | "slow" | "blocked";

export function hostedAiCeilingMultiplier(
  value = HOSTED_AI_CONFIG.ceilingMultiplier
) {
  return Number.isFinite(value) ? Math.max(1, value) : 2;
}

export function usageMonth(date = newDate()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

export function hostedUsageStatus(
  actionCount: number,
  plan: keyof typeof HOSTED_AI_CONFIG.monthlyActionCaps = "FREE",
  multiplier = hostedAiCeilingMultiplier()
) {
  const limit = Math.max(0, HOSTED_AI_CONFIG.monthlyActionCaps[plan]);
  const used = Math.max(0, actionCount);
  const ceiling = Math.ceil(limit * hostedAiCeilingMultiplier(multiplier));
  const mode: HostedAiUsageMode =
    limit === 0 || used >= ceiling
      ? "blocked"
      : used >= limit
        ? "slow"
        : "normal";
  return {
    plan,
    used,
    limit,
    ceiling,
    remaining: Math.max(0, limit - used),
    allowed: mode !== "blocked",
    slowMode: mode === "slow",
    exhausted: mode === "blocked",
    mode,
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

export async function claimHostedAiAction(userId: string) {
  const yearMonth = usageMonth();
  const plan = await getPlan(userId);
  const status = hostedUsageStatus(0, plan);
  if (status.ceiling === 0) {
    return {
      claimed: false,
      mode: "blocked" as const,
      usage: status,
      yearMonth,
    };
  }

  const rows = await prisma.$queryRaw<Array<{ actionCount: number }>>`
    INSERT INTO "AiUsage" (
      "id", "userId", "yearMonth", "actionCount", "createdAt", "updatedAt"
    )
    VALUES (${randomUUID()}, ${userId}, ${yearMonth}, 1, NOW(), NOW())
    ON CONFLICT ("userId", "yearMonth") DO UPDATE
    SET
      "actionCount" = "AiUsage"."actionCount" + 1,
      "updatedAt" = NOW()
    WHERE "AiUsage"."actionCount" < ${status.ceiling}
    RETURNING "actionCount"
  `;

  const actionCount = rows[0]?.actionCount;
  if (actionCount === undefined) {
    const usage = hostedUsageStatus(status.ceiling, plan);
    return {
      claimed: false,
      mode: "blocked" as const,
      usage,
      yearMonth,
    };
  }

  const mode: HostedAiUsageMode =
    actionCount > status.limit ? "slow" : "normal";
  return {
    claimed: true,
    mode,
    usage: hostedUsageStatus(actionCount, plan),
    yearMonth,
  };
}

export async function releaseHostedAiAction(userId: string, yearMonth: string) {
  await prisma.$executeRaw`
    UPDATE "AiUsage"
    SET
      "actionCount" = GREATEST("actionCount" - 1, 0),
      "updatedAt" = NOW()
    WHERE
      "userId" = ${userId}
      AND "yearMonth" = ${yearMonth}
      AND "actionCount" > 0
  `;
}
