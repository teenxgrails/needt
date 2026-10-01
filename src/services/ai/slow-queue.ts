import { setTimeout as wait } from "timers/promises";

import { getRedisConnection } from "@/lib/queue/connection";
import { hashRateLimitIdentifier } from "@/lib/security/rate-limit";

const SLOT_SPACING_MS = 1_500;
const MAX_WAIT_MS = 6_000;
const SLOT_SCRIPT = `
local now = tonumber(ARGV[1])
local spacing = tonumber(ARGV[2])
local maxWait = tonumber(ARGV[3])
local previous = tonumber(redis.call("GET", KEYS[1]) or "0")
local slot = math.max(now, previous) + spacing
local delay = slot - now
if delay > maxWait then return -1 end
redis.call("SET", KEYS[1], slot, "PX", maxWait + spacing)
return delay
`;

export const HOSTED_AI_BUSY_MESSAGE =
  "AI is busy, so replies may take a little longer. Add your own key for full speed.";
export const HOSTED_AI_RESTING_MESSAGE =
  "AI is resting until the 1st. Add your own key to keep going.";

export class HostedAiQueueError extends Error {
  constructor() {
    super(HOSTED_AI_BUSY_MESSAGE);
    this.name = "HostedAiQueueError";
  }
}

export async function waitForHostedAiSlot(
  userId: string,
  options: { now?: number; sleep?: (delay: number) => Promise<unknown> } = {}
) {
  try {
    const redis = getRedisConnection();
    const identifier = hashRateLimitIdentifier(userId);
    const delay = Number(
      await redis.eval(
        SLOT_SCRIPT,
        1,
        `needt:ai-slow:${identifier}`,
        String(options.now ?? Date.now()),
        String(SLOT_SPACING_MS),
        String(MAX_WAIT_MS)
      )
    );
    if (!Number.isFinite(delay) || delay < 0 || delay > MAX_WAIT_MS) {
      throw new HostedAiQueueError();
    }
    await (options.sleep ?? wait)(delay);
  } catch (error) {
    if (error instanceof HostedAiQueueError) throw error;
    throw new HostedAiQueueError();
  }
}
