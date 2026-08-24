import {
  warnAboutMissingVapidConfigurationOnce,
  warnIfVapidConfigurationIsMissingOnce,
} from "@/services/reminders/reminder-delivery";

import { logger } from "@/lib/logger";

jest.mock("@/lib/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
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
    process.env.VAPID_SUBJECT = "mailto:push@example.com";
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "public-key";
    process.env.VAPID_PRIVATE_KEY = "private-key";

    await warnIfVapidConfigurationIsMissingOnce();

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("logs the missing variable names once per process", async () => {
    await warnAboutMissingVapidConfigurationOnce(["VAPID_PRIVATE_KEY"]);
    await warnAboutMissingVapidConfigurationOnce([
      "VAPID_SUBJECT",
      "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
    ]);

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      "Web Push delivery is unavailable; missing environment variables: VAPID_PRIVATE_KEY",
      { missingVariables: ["VAPID_PRIVATE_KEY"] },
      "ReminderDelivery"
    );
  });
});
