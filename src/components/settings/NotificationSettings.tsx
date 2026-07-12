import { Switch } from "@/components/ui/switch";

import { useSettingsStore } from "@/store/settings";

import { SettingRow, SettingsSection } from "./SettingsSection";

export function NotificationSettings() {
  const { notifications, updateNotificationSettings } = useSettingsStore();

  const enablePush = async (enabled: boolean) => {
    if (!enabled) {
      updateNotificationSettings({
        webPushEnabled: false,
        webPushSubscription: null,
      });
      return;
    }

    if (
      typeof window === "undefined" ||
      typeof navigator === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator)
    ) {
      updateNotificationSettings({ webPushEnabled: false });
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      updateNotificationSettings({ webPushEnabled: false });
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    let subscription: PushSubscriptionJSON | null = null;

    if (vapidKey) {
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      subscription = pushSubscription.toJSON();
    }

    updateNotificationSettings({
      webPushEnabled: true,
      webPushSubscription: subscription,
    });
  };

  return (
    <SettingsSection
      title="Notifications"
      description="Choose which planner updates can interrupt you. Browser alerts stay off until you enable them."
    >
      <SettingRow
        label="Daily plan email"
        description="Receive a concise email with upcoming meetings and tasks."
      >
        <Switch
          checked={notifications.dailyEmailEnabled}
          onCheckedChange={(enabled) =>
            updateNotificationSettings({ dailyEmailEnabled: enabled })
          }
        />
      </SettingRow>

      <SettingRow
        label="Web Push"
        description="Focus endings, upcoming tasks, and gentle streak reminders. Off by default."
      >
        <Switch
          checked={notifications.webPushEnabled}
          onCheckedChange={enablePush}
        />
      </SettingRow>
    </SettingsSection>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
