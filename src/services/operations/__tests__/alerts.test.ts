import { raiseOperationsAlert } from "@/services/operations/alerts";
import * as Sentry from "@sentry/node";

import { EmailService } from "@/lib/email/email-service";
import { getRedisConnection } from "@/lib/queue/connection";

jest.mock("@sentry/node", () => ({ captureMessage: jest.fn() }));
jest.mock("@/lib/app-config", () => ({ APP_NAME: "Needt" }));
jest.mock("@/lib/logger", () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));
jest.mock("@/lib/email/email-service", () => ({
  EmailService: { sendEmail: jest.fn().mockResolvedValue({ jobId: "job" }) },
}));
jest.mock("@/lib/queue/connection", () => ({
  getRedisConnection: jest.fn(),
}));

const redis = { set: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  (getRedisConnection as jest.Mock).mockReturnValue(redis);
  redis.set.mockResolvedValue("OK");
  process.env.NEEDT_ALERT_EMAIL = "owner@needt.app";
});

afterEach(() => {
  delete process.env.NEEDT_ALERT_EMAIL;
});

describe("raising an operations alert", () => {
  it("emails the owner on a critical alert, not only Sentry", async () => {
    await expect(
      raiseOperationsAlert("queue:reminders", "critical", "reminders backed up")
    ).resolves.toBe(true);

    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      "reminders backed up",
      "fatal"
    );
    expect(EmailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "owner@needt.app" })
    );
  });

  it("leaves a warning in Sentry without mailing anyone", async () => {
    // Paging on every two-minute backlog teaches the owner to ignore the channel.
    await raiseOperationsAlert("queue:mail", "warning", "mail slightly behind");

    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      "mail slightly behind",
      "warning"
    );
    expect(EmailService.sendEmail).not.toHaveBeenCalled();
  });

  it("sends nothing twice while the dedupe window holds", async () => {
    redis.set.mockResolvedValue(null);

    await expect(
      raiseOperationsAlert("cron:reschedule", "critical", "cron missed")
    ).resolves.toBe(false);
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
    expect(EmailService.sendEmail).not.toHaveBeenCalled();
  });

  it("still alerts when Redis itself is unreachable", async () => {
    redis.set.mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(
      raiseOperationsAlert("db", "critical", "database unreachable")
    ).resolves.toBe(true);
    expect(EmailService.sendEmail).toHaveBeenCalled();
  });

  it("stays quiet by email when no alert address is configured", async () => {
    delete process.env.NEEDT_ALERT_EMAIL;

    await raiseOperationsAlert("db", "critical", "database unreachable");

    expect(Sentry.captureMessage).toHaveBeenCalled();
    expect(EmailService.sendEmail).not.toHaveBeenCalled();
  });

  it("does not let a failed send swallow the alert", async () => {
    (EmailService.sendEmail as jest.Mock).mockRejectedValue(
      new Error("resend down")
    );

    await expect(
      raiseOperationsAlert("db", "critical", "database unreachable")
    ).resolves.toBe(true);
  });
});
