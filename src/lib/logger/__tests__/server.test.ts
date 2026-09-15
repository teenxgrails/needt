import { ServerLogger } from "@/lib/logger/server";
import { LogSettings } from "@/lib/logger/types";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    log: {
      create: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

describe("ServerLogger batch persistence", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("never persists a batch when database logging is disabled", async () => {
    const result = await new ServerLogger().writeBatch([
      {
        level: "error",
        message: "an error occurred",
        timestamp: new Date("2026-08-23T00:00:00Z"),
      },
    ]);

    expect(result).toEqual({ success: true, count: 0 });
    expect(prisma.log.createMany).not.toHaveBeenCalled();
  });

  it("sanitizes batch entries immediately before persistence", async () => {
    const logger = new ServerLogger();
    const settings: LogSettings = {
      logLevel: "debug",
      logDestination: "db",
      logRetention: { error: 30, warn: 14, info: 7, debug: 3 },
    };
    jest
      .spyOn(
        logger as unknown as { getLogSettings: () => Promise<LogSettings> },
        "getLogSettings"
      )
      .mockResolvedValue(settings);
    jest.mocked(prisma.log.createMany).mockResolvedValue({ count: 1 } as never);

    await logger.writeBatch([
      {
        level: "error",
        message: "Reset failed for person@example.com",
        metadata: { token: "secret", retry: true },
        timestamp: new Date("2026-08-23T00:00:00Z"),
      },
    ]);

    expect(prisma.log.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            message: "Reset failed for [redacted email]",
            metadata: { retry: true },
          }),
        ],
      })
    );
  });
});
