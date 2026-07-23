import { toast } from "sonner";

import { useSettingsStore } from "@/store/settings";

import { MotionSwitchRow } from "./MotionSettingsControls";
import { SettingsSection } from "./SettingsSection";

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

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        updateNotificationSettings({ webPushEnabled: false });
        toast.info("Browser notifications remain off");
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
      toast.success("Browser notifications enabled");
    } catch {
      updateNotificationSettings({ webPushEnabled: false });
      toast.error("Could not enable browser notifications");
    }
  };

  const notificationRows = [
    {
      key: "eventInvites" as const,
      label: "New invitations",
    },
    {
      key: "eventUpdates" as const,
      label: "Event changes",
    },
    {
      key: "eventCancellations" as const,
      label: "Cancellations",
    },
    {
      key: "eventReminders" as const,
      label: "Upcoming events",
    },
  ];

  return (
    <div className="max-w-[896px] space-y-9">
      <SettingsSection
        title="Delivery"
        description="Choose where Needt can reach you. Browser notifications always require your permission."
      >
        <div className="space-y-0.5">
          <MotionSwitchRow
            label="Daily plan email"
            checked={notifications.dailyEmailEnabled}
            onCheckedChange={(enabled) =>
              updateNotificationSettings({ dailyEmailEnabled: enabled })
            }
          />
          <MotionSwitchRow
            label="Browser notifications"
            checked={notifications.webPushEnabled}
            onCheckedChange={enablePush}
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Calendar alerts"
        description="Select which calendar changes should produce a notification."
      >
        <div className="space-y-0.5">
          {notificationRows.map((row) => (
            <MotionSwitchRow
              key={row.key}
              label={row.label}
              checked={notifications.notifyFor[row.key]}
              onCheckedChange={(checked) =>
                updateNotificationSettings({
                  notifyFor: {
                    ...notifications.notifyFor,
                    [row.key]: checked,
                  },
                })
              }
              indented
            />
          ))}
        </div>
      </SettingsSection>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
