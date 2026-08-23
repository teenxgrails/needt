import {
  type ReleaseHealthRedis,
  WORKER_RELEASE_HEARTBEAT_TTL_SECONDS,
  readWorkerReleaseBuildSha,
  recordWorkerReleaseHeartbeat,
} from "@/lib/health/worker-release";

const SHA = "b".repeat(40);

function redisDouble(value: string | null = "ready") {
  return {
    get: jest.fn().mockResolvedValue(value),
    set: jest.fn().mockResolvedValue("OK"),
  } as jest.Mocked<ReleaseHealthRedis>;
}

describe("worker release heartbeat", () => {
  it("records a short-lived heartbeat scoped to the release SHA", async () => {
    const redis = redisDouble();

    await recordWorkerReleaseHeartbeat(redis, SHA);

    expect(redis.set).toHaveBeenCalledWith(
      `needt:release-health:worker:${SHA}`,
      "ready",
      "EX",
      WORKER_RELEASE_HEARTBEAT_TTL_SECONDS
    );
  });

  it("returns the expected SHA only while its heartbeat exists", async () => {
    await expect(readWorkerReleaseBuildSha(SHA, redisDouble())).resolves.toBe(
      SHA
    );
    await expect(
      readWorkerReleaseBuildSha(SHA, redisDouble(null))
    ).resolves.toBeNull();
  });

  it("rejects invalid writer identities and masks Redis read failures", async () => {
    await expect(
      recordWorkerReleaseHeartbeat(redisDouble(), "local")
    ).rejects.toThrow("requires a valid Git commit SHA");
    const redis = redisDouble();
    redis.get.mockRejectedValue(new Error("redis unavailable"));
    await expect(readWorkerReleaseBuildSha(SHA, redis)).resolves.toBeNull();
  });
});
