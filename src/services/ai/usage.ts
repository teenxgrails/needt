import { randomUUID } from "crypto";

import { newDate } from "@/lib/date-utils";
import { getPlan } from "@/lib/entitlements";
import { prisma } from "@/lib/prisma";

import { AIProviderUsage } from "./types";

export const HOSTED_AI_CONFIG = {
  monthlyActionCaps: {
    /**
     * A free account gets a small allowance rather than nothing. The agent is
     * the product's own headline, and a person who has never seen it work has
     * no reason to pay for it.
     */
    FREE: Number(process.env.NEEDT_AI_FREE_ACTION_CAP || 20),
    PRO: Number(process.env.NEEDT_AI_MONTHLY_ACTION_CAP || 300),
    LIFETIME: Number(process.env.NEEDT_AI_LIFETIME_ACTION_CAP || 300),
  },
  ceilingMultiplier: Number(process.env.NEEDT_AI_CEILING_MULTIPLIER || 2),
  baseUrl:
    process.env.NEEDT_AI_BASE_URL?.trim() || "https://openrouter.ai/api/v1",
  model: process.env.NEEDT_AI_MODEL?.trim() || "z-ai/glm-5.3-flash",
} as const;

/**
 * Gateway routing for the hosted key.
 *
 * `data_collection: "deny"` is the load-bearing part: it keeps the request
 * away from hosts that may retain or train on it, and it holds whatever the
 * provider slugs happen to be called. The allow-list narrows it further to
 * named hosts and is left to configuration, because a slug this code guessed
 * wrong would refuse every request instead of routing it.
 */
export function hostedAiRoutingBody(): Record<string, unknown> {
  const allowList = (process.env.NEEDT_AI_GATEWAY_PROVIDERS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const provider: Record<string, unknown> = { data_collection: "deny" };
  if (allowList.length > 0) provider.only = allowList;
  return { provider };
}

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

/**
 * What a client is allowed to learn about someone's hosted AI usage.
 *
 * The counts are deliberately absent from product surfaces, and
 * `scripts/check-ui-contracts.mjs` guards that. Sending them anyway only moved
 * the leak to the network tab, so the boundary drops them here instead: the UI
 * needs the mode, never the number.
 */
export function publicHostedAiUsage(
  status: Awaited<ReturnType<typeof getHostedAiUsage>>
) {
  return {
    plan: status.plan,
    allowed: status.allowed,
    slowMode: status.slowMode,
    exhausted: status.exhausted,
  };
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

function tokenCount(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export async function recordHostedAiTokens(
  userId: string,
  usage: AIProviderUsage
) {
  const inputTokens = tokenCount(usage.inputTokens);
  const outputTokens = tokenCount(usage.outputTokens);
  if (inputTokens === 0 && outputTokens === 0) return;

  const yearMonth = usageMonth();
  await prisma.aiUsage.upsert({
    where: { userId_yearMonth: { userId, yearMonth } },
    create: { userId, yearMonth, inputTokens, outputTokens },
    update: {
      inputTokens: { increment: inputTokens },
      outputTokens: { increment: outputTokens },
    },
  });
}
