import { NextRequest } from "next/server";

import { GET, PATCH } from "@/app/api/notification-settings/route";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/auth/api-auth", () => ({ authenticateRequest: jest.fn() }));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    notificationSettings: { upsert: jest.fn() },
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockAuthenticateRequest = jest.mocked(authenticateRequest);
const mockUpsert = jest.mocked(prisma.notificationSettings.upsert);

const originalVapidEnvironment = {
  subject: process.env.VAPID_SUBJECT,
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
};

function notificationSettings() {
  return {
    userId: "user-1",
    emailNotifications: true,
    dailyEmailEnabled: true,
    eventInvites: true,
    eventUpdates: true,
    eventCancellations: true,
    eventReminders: true,
    defaultReminderTiming: "[30]",
    webPushEnabled: true,
    webPushSubscription: null,
  };
}

function assertResponse(response: Response | undefined): Response {
  if (!response) throw new Error("Expected a route response.");
  return response;
}

function setConfiguredVapidEnvironment() {
  process.env.VAPID_SUBJECT = "mailto:push@example.com";
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "public-key";
  process.env.VAPID_PRIVATE_KEY = "private-key";
}

function restoreEnvironmentVariable(
  name: "VAPID_SUBJECT" | "NEXT_PUBLIC_VAPID_PUBLIC_KEY" | "VAPID_PRIVATE_KEY",
  value: string | undefined
) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

beforeEach(() => {
  jest.clearAllMocks();
  setConfiguredVapidEnvironment();
  mockAuthenticateRequest.mockResolvedValue({ userId: "user-1" } as never);
  mockUpsert.mockResolvedValue(notificationSettings() as never);
});

afterAll(() => {
  restoreEnvironmentVariable("VAPID_SUBJECT", originalVapidEnvironment.subject);
  restoreEnvironmentVariable(
    "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
    originalVapidEnvironment.publicKey
  );
  restoreEnvironmentVariable(
    "VAPID_PRIVATE_KEY",
    originalVapidEnvironment.privateKey
  );
});

describe("notification settings Web Push availability", () => {
  it("returns a boolean without exposing VAPID key material", async () => {
    const response = assertResponse(
      await GET(new NextRequest("http://localhost/api/notification-settings"))
    );
    const body = await response.json();

    expect(body.webPushConfigured).toBe(true);
    expect(body).not.toHaveProperty("VAPID_SUBJECT");
    expect(body).not.toHaveProperty("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
    expect(body).not.toHaveProperty("VAPID_PRIVATE_KEY");
  });

  it("reports Web Push unavailable without clearing the saved preference", async () => {
    delete process.env.VAPID_PRIVATE_KEY;

    const response = assertResponse(
      await PATCH(
        new NextRequest("http://localhost/api/notification-settings", {
          method: "PATCH",
          body: JSON.stringify({ webPushEnabled: true }),
        })
      )
    );
    const body = await response.json();

    expect(body.webPushConfigured).toBe(false);
    expect(body.webPushEnabled).toBe(false);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ webPushEnabled: true }),
      })
    );
  });
});
