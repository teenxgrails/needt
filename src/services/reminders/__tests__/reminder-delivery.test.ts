jest.mock("@/lib/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn().mockResolvedValue(undefined),
    error: jest.fn(),
  },
}));

jest.mock("@/lib/prisma", () => ({ prisma: {} }));

jest.mock("@/lib/email/email-service", () => ({
  EmailService: { sendEmail: jest.fn() },
}));

const originalVapidEnvironment = {
  subject: process.env.VAPID_SUBJECT,
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
};

const subscription = {
  id: "push-1",
  endpoint: "https://push.example.test/subscription",
  p256dh: "p256dh",
  auth: "auth",
};
const payload = {
  title: "Task starts soon",
  body: "Write regression test",
  url: "/today?task=task-1",
};

function setConfiguredVapidEnvironment() {
  process.env.VAPID_SUBJECT = "mailto:push@example.com";
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "public-key";
  process.env.VAPID_PRIVATE_KEY = "private-key";
}

beforeEach(setConfiguredVapidEnvironment);

afterAll(() => {
  const restore = (name: string, value: string | undefined) => {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  };
  restore("VAPID_SUBJECT", originalVapidEnvironment.subject);
  restore("NEXT_PUBLIC_VAPID_PUBLIC_KEY", originalVapidEnvironment.publicKey);
  restore("VAPID_PRIVATE_KEY", originalVapidEnvironment.privateKey);
});

describe("missing VAPID configuration warning", () => {
  it("does not warn when the worker has a complete VAPID identity", async () => {
    await jest.isolateModulesAsync(async () => {
      const { logger } = await import("@/lib/logger");
      const { warnIfVapidConfigurationIsMissingOnce } = await import(
        "@/services/reminders/reminder-delivery"
      );

      await warnIfVapidConfigurationIsMissingOnce();

      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  it("returns false and warns when deliverPush cannot load VAPID configuration", async () => {
    delete process.env.VAPID_PRIVATE_KEY;
    await jest.isolateModulesAsync(async () => {
      const { logger } = await import("@/lib/logger");
      const { deliverPush } = await import(
        "@/services/reminders/reminder-delivery"
      );

      await expect(deliverPush(subscription, payload)).resolves.toBe(false);

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        "Web Push delivery is unavailable; missing environment variables: VAPID_PRIVATE_KEY",
        { missingVariables: ["VAPID_PRIVATE_KEY"] },
        "ReminderDelivery"
      );
    });
  });

  it("retries the warning after logger failure and stops only after success", async () => {
    delete process.env.VAPID_PRIVATE_KEY;
    await jest.isolateModulesAsync(async () => {
      const { logger } = await import("@/lib/logger");
      const mockWarn = jest.mocked(logger.warn);
      mockWarn
        .mockRejectedValueOnce(new Error("logger unavailable"))
        .mockResolvedValue(undefined);
      const { deliverPush } = await import(
        "@/services/reminders/reminder-delivery"
      );

      await expect(deliverPush(subscription, payload)).rejects.toThrow(
        "logger unavailable"
      );
      await expect(deliverPush(subscription, payload)).resolves.toBe(false);
      await expect(deliverPush(subscription, payload)).resolves.toBe(false);

      expect(logger.warn).toHaveBeenCalledTimes(2);
    });
  });

  it("coalesces concurrent missing-configuration warnings", async () => {
    delete process.env.VAPID_PRIVATE_KEY;
    await jest.isolateModulesAsync(async () => {
      const { logger } = await import("@/lib/logger");
      const mockWarn = jest.mocked(logger.warn);
      let resolveWarning: (() => void) | undefined;
      mockWarn.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveWarning = resolve;
          })
      );
      const { deliverPush } = await import(
        "@/services/reminders/reminder-delivery"
      );

      const first = deliverPush(subscription, payload);
      const second = deliverPush(subscription, payload);
      expect(logger.warn).toHaveBeenCalledTimes(1);
      resolveWarning?.();

      await expect(Promise.all([first, second])).resolves.toEqual([
        false,
        false,
      ]);
      expect(logger.warn).toHaveBeenCalledTimes(1);
    });
  });
});
