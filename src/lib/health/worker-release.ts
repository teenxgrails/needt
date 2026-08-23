import IORedis from "ioredis";

import { isGitBuildSha } from "@/lib/health/build-sha";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "WorkerReleaseHealth";
const WORKER_RELEASE_KEY_PREFIX = "needt:release-health:worker";
export const WORKER_RELEASE_HEARTBEAT_INTERVAL_MS = 15_000;
export const WORKER_RELEASE_HEARTBEAT_TTL_SECONDS = 45;

export interface ReleaseHealthRedis {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    expiryMode: "EX",
    ttlSeconds: number
  ): Promise<unknown>;
}

let releaseHealthReader: IORedis | null = null;

function workerReleaseKey(buildSha: string): string {
  return `${WORKER_RELEASE_KEY_PREFIX}:${buildSha}`;
}

function getReleaseHealthReader(): ReleaseHealthRedis {
  if (!releaseHealthReader) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error("REDIS_URL is required to read worker release health");
    }
    releaseHealthReader = new IORedis(redisUrl, {
      commandTimeout: 1_500,
      connectTimeout: 1_500,
      enableReadyCheck: true,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    releaseHealthReader.on("error", (error) => {
      void logger.error(
        "Release-health Redis connection error",
        { error: error.message },
        LOG_SOURCE
      );
    });
  }
  return releaseHealthReader as unknown as ReleaseHealthRedis;
}

export async function recordWorkerReleaseHeartbeat(
  redis: ReleaseHealthRedis,
  buildSha: string
): Promise<void> {
  if (!isGitBuildSha(buildSha)) {
    throw new Error("Worker release heartbeat requires a valid Git commit SHA");
  }
  await redis.set(
    workerReleaseKey(buildSha),
    "ready",
    "EX",
    WORKER_RELEASE_HEARTBEAT_TTL_SECONDS
  );
}

export async function readWorkerReleaseBuildSha(
  buildSha: string,
  redis: ReleaseHealthRedis = getReleaseHealthReader()
): Promise<string | null> {
  if (!isGitBuildSha(buildSha)) return null;
  try {
    return (await redis.get(workerReleaseKey(buildSha))) === "ready"
      ? buildSha
      : null;
  } catch {
    return null;
  }
}
