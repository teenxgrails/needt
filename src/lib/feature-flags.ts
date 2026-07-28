import { createHash } from "crypto";

import { prisma } from "@/lib/prisma";

function rolloutBucket(flagKey: string, userId: string) {
  const digest = createHash("sha256")
    .update(`${flagKey}:${userId}`)
    .digest();
  return digest.readUInt32BE(0) % 100;
}

export async function isFeatureEnabled(flagKey: string, userId: string) {
  const flag = await prisma.featureFlag.findUnique({
    where: { key: flagKey },
    include: {
      overrides: {
        where: { userId },
        select: { enabled: true },
        take: 1,
      },
    },
  });
  const override = flag?.overrides[0];
  if (override) return override.enabled;
  if (!flag?.enabled) return false;
  return rolloutBucket(flagKey, userId) < flag.rolloutPercentage;
}
