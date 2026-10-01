import { Prisma, SubscriptionPlan } from "@prisma/client";

import { addCalendarDays, newDate } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";

export const TRIAL_DURATION_DAYS = 14;

type TrialTransaction = Prisma.TransactionClient;

export async function runTrialTransaction<T>(
  operation: (tx: TrialTransaction) => Promise<T>
): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        attempt < 2 &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034"
      ) {
        continue;
      }
      throw error;
    }
  }
  throw new Error("Trial transaction retry limit reached");
}

export function normalizeTrialEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at <= 0 || at === normalized.length - 1) return normalized;

  let local = normalized.slice(0, at);
  let domain = normalized.slice(at + 1);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    local = local.split("+", 1)[0].replaceAll(".", "");
    domain = "gmail.com";
  }
  return `${local}@${domain}`;
}

export async function startTrialForVerifiedUser(
  tx: TrialTransaction,
  input: { userId: string; email: string; now?: Date }
) {
  const now = input.now ?? newDate();
  const emailKey = normalizeTrialEmail(input.email);
  const endsAt = addCalendarDays(now, TRIAL_DURATION_DAYS);

  await tx.subscription.upsert({
    where: { userId: input.userId },
    update: {},
    create: {
      userId: input.userId,
      plan: SubscriptionPlan.FREE,
    },
  });
  await tx.trialGrant.createMany({
    data: {
      emailKey,
      userId: input.userId,
      startedAt: now,
      endsAt,
    },
    skipDuplicates: true,
  });

  const grant = await tx.trialGrant.findUnique({ where: { emailKey } });
  return grant?.userId === input.userId ? grant : null;
}

export async function markEmailVerifiedAndStartTrial(input: {
  userId: string;
  email: string;
  now?: Date;
}) {
  return runTrialTransaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: input.userId },
      data: { emailVerified: input.now ?? newDate() },
      select: { id: true, email: true, emailVerified: true },
    });
    if (!user.email) return { user, trial: null };
    const trial = await startTrialForVerifiedUser(tx, {
      userId: user.id,
      email: user.email,
      now: input.now,
    });
    return { user, trial };
  });
}
