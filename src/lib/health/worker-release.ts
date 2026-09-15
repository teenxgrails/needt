import IORedis from "ioredis";

import { isGitBuildSha } from "@/lib/health/build-sha";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "WorkerReleaseHealth";
const WORKER_RELEASE_KEY_PREFIX = "needt:release-health:worker";
export const WORKER_RELEASE_HEARTBEAT_INTERVAL_MS = 15_000;
export const WORKER_RELEASE_HEARTBEAT_TTL_SECONDS = 45;
export const WORKER_RELEASE_READ_TIMEOUT_MS = 1_000;
const RELEASE_HEARTBEAT_DELETE_IF_CURRENT = `
  if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
  end
  return 0
`;

export interface ReleaseHealthRedis {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    expiryMode: "EX",
    ttlSeconds: number
  ): Promise<unknown>;
  eval(
    script: string,
    numberOfKeys: number,
    ...arguments_: string[]
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
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });
    releaseHealthReader.on("error", (error) => {
      void logger.error(
        "Release-health Redis connection error",
        { error: error.message },
        LOG_SOURCE
      );
    });
    releaseHealthReader.on("end", () => {
      releaseHealthReader = null;
    });
  }
  return releaseHealthReader as unknown as ReleaseHealthRedis;
}

export async function recordWorkerReleaseHeartbeat(
  redis: ReleaseHealthRedis,
  buildSha: string,
  value = "ready"
): Promise<void> {
  if (!isGitBuildSha(buildSha)) {
    throw new Error("Worker release heartbeat requires a valid Git commit SHA");
  }
  await redis.set(
    workerReleaseKey(buildSha),
    value,
    "EX",
    WORKER_RELEASE_HEARTBEAT_TTL_SECONDS
  );
}

export async function removeWorkerReleaseHeartbeat(
  redis: ReleaseHealthRedis,
  buildSha: string,
  value: string
): Promise<void> {
  if (!isGitBuildSha(buildSha)) return;
  await redis.eval(
    RELEASE_HEARTBEAT_DELETE_IF_CURRENT,
    1,
    workerReleaseKey(buildSha),
    value
  );
}

export async function readWorkerReleaseBuildSha(
  buildSha: string,
  redis: ReleaseHealthRedis = getReleaseHealthReader(),
  timeoutMs = WORKER_RELEASE_READ_TIMEOUT_MS
): Promise<string | null> {
  if (!isGitBuildSha(buildSha)) return null;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const value = await Promise.race([
      redis.get(workerReleaseKey(buildSha)),
      new Promise<null>((resolve) => {
        timeout = setTimeout(resolve, timeoutMs, null);
        timeout.unref();
      }),
    ]);
    return value ? buildSha : null;
  } catch {
    return null;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
