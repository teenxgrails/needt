import { createHash } from "node:crypto";

import { newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { getRedisConnection } from "@/lib/queue/connection";

const LOG_SOURCE = "PagePublicationRealtime";

export function pagePublicationChannel(token: string) {
  const digest = createHash("sha256").update(token).digest("hex");
  return `needt:page-publication:${digest}`;
}

export async function publishPagePublicationRevoked(token: string) {
  if (!process.env.REDIS_URL?.trim()) return;
  try {
    await getRedisConnection().publish(
      pagePublicationChannel(token),
      JSON.stringify({ type: "revoked", occurredAt: newDate().toISOString() })
    );
  } catch (error) {
    await logger.warn(
      "Could not publish Page revocation",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
  }
}
