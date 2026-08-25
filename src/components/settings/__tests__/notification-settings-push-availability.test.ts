import { createElement } from "react";

import { renderToStaticMarkup } from "react-dom/server";

import { NotificationSettings } from "@/components/settings/NotificationSettings";

import { useSettingsStore } from "@/store/settings";

jest.mock("@/store/settings", () => ({
  useSettingsStore: jest.fn(),
}));

jest.mock("@/components/settings/MotionSettingsControls", () => ({
  MotionSwitchRow: ({
    label,
    checked,
    disabled,
  }: {
    label: string;
    checked: boolean;
    disabled?: boolean;
  }) =>
    createElement("span", {
      "data-label": label,
      "data-checked": String(checked),
      "data-disabled": String(disabled ?? false),
    }),
}));

function renderNotificationSettings() {
  return renderToStaticMarkup(createElement(NotificationSettings));
}

const mockUseSettingsStore = jest.mocked(useSettingsStore);

function notificationState(
  webPushConfigured: boolean,
  webPushEnabled: boolean
) {
  return {
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
      webPushConfigured,
      webPushEnabled,
      webPushSubscription: null,
    },
    updateNotificationSettings: jest.fn(),
  } as never;
}

describe("Notification settings push availability", () => {
  it("renders a disabled, unchecked switch and explanation when unavailable", () => {
    mockUseSettingsStore.mockReturnValue(notificationState(false, true));

    const markup = renderNotificationSettings();

    expect(markup).toContain(
      'data-label="Browser notifications" data-checked="false" data-disabled="true"'
    );
    expect(markup).toContain(
      "Push delivery setup is incomplete on this Needt server. Browser notifications are unavailable. Email reminders still work."
    );
  });

  it("renders an enabled, checked switch when configured and preferred", () => {
    mockUseSettingsStore.mockReturnValue(notificationState(true, true));

    const markup = renderNotificationSettings();

    expect(markup).toContain(
      'data-label="Browser notifications" data-checked="true" data-disabled="false"'
    );
    expect(markup).not.toContain("Push delivery setup is incomplete");
  });
});
