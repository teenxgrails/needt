/** @jest-environment jsdom */
import { logger } from "@/lib/logger";

import { useSettingsStore } from "@/store/settings";

jest.mock("@/lib/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const apiResponses: Record<string, unknown> = {
  "/api/user-settings": {
    theme: "dark",
    defaultView: "week",
    timeZone: "UTC",
    secondaryTimeZone: null,
    weekStartDay: "monday",
    timeFormat: "24h",
  },
  "/api/calendar-settings": {
    defaultCalendarId: null,
    workingHoursEnabled: true,
    workingHoursStart: "09:00",
    workingHoursEnd: "17:00",
    workingHoursDays: "[1,2,3,4,5]",
    defaultDuration: 60,
    defaultColor: "#6366F1",
    defaultReminder: 30,
    refreshInterval: 5,
  },
  "/api/notification-settings": {
    emailNotifications: true,
    dailyEmailEnabled: true,
    notifyFor: {
      eventInvites: false,
      eventUpdates: true,
      eventCancellations: false,
      eventReminders: true,
    },
    defaultReminderTiming: [15, 45],
    webPushConfigured: false,
    webPushEnabled: true,
    webPushSubscription: null,
  },
  "/api/integration-settings": {
    googleCalendarEnabled: false,
    googleCalendarAutoSync: false,
    googleCalendarInterval: 5,
    outlookCalendarEnabled: false,
    outlookCalendarAutoSync: false,
    outlookCalendarInterval: 5,
  },
  "/api/data-settings": {
    autoBackup: false,
    backupInterval: 7,
    retainDataFor: 365,
  },
  "/api/auto-schedule-settings": {
    workDays: "[1,2,3,4,5]",
    workHourStart: 9,
    workHourEnd: 17,
    selectedCalendars: "[]",
    bufferMinutes: 15,
    highEnergyStart: 9,
    highEnergyEnd: 12,
    mediumEnergyStart: 13,
    mediumEnergyEnd: 15,
    lowEnergyStart: 15,
    lowEnergyEnd: 17,
    groupByProject: false,
  },
  "/api/system-settings": {
    googleClientId: null,
    googleClientSecret: null,
    outlookClientId: null,
    outlookClientSecret: null,
    outlookTenantId: null,
    logLevel: "none",
    logRetention: 7,
    logDestination: "database",
    disableHomepage: false,
  },
  "/api/accounts": [],
};

describe("notification settings store contract", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSettingsStore.setState({
      initialized: false,
      notifications: {
        emailNotifications: true,
        dailyEmailEnabled: true,
        notifyFor: {
          eventInvites: true,
          eventUpdates: true,
          eventCancellations: true,
          eventReminders: true,
        },
        defaultReminderTiming: [30],
        webPushConfigured: false,
        webPushEnabled: false,
        webPushSubscription: null,
      },
    });
    global.fetch = jest.fn(async (input) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.pathname
            : input.url;
      return {
        json: async () => apiResponses[url],
      } as Response;
    });
  });

  it("preserves the saved push preference in an unrelated GET-to-PATCH round trip", async () => {
    await useSettingsStore.getState().initializeSettings();

    expect(useSettingsStore.getState().notifications).toMatchObject({
      notifyFor: {
        eventInvites: false,
        eventUpdates: true,
        eventCancellations: false,
        eventReminders: true,
      },
      defaultReminderTiming: [15, 45],
      webPushConfigured: false,
      webPushEnabled: true,
    });

    useSettingsStore
      .getState()
      .updateNotificationSettings({ dailyEmailEnabled: false });

    const notificationPatch = jest
      .mocked(global.fetch)
      .mock.calls.find(
        ([input, init]) =>
          input === "/api/notification-settings" && init?.method === "PATCH"
      );
    expect(notificationPatch).toBeDefined();
    const body = JSON.parse(String(notificationPatch?.[1]?.body));
    expect(body).toMatchObject({
      dailyEmailEnabled: false,
      eventInvites: false,
      eventUpdates: true,
      eventCancellations: false,
      eventReminders: true,
      defaultReminderTiming: [15, 45],
      webPushEnabled: true,
    });
    expect(logger.error).not.toHaveBeenCalled();
  });
});
