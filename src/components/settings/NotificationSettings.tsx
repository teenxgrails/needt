import { BellRing, CalendarClock, Mail, Monitor } from "lucide-react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";

import { useSettingsStore } from "@/store/settings";

import { SettingsCard, SettingsSection } from "./SettingsSection";

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
      description: "When an event invitation arrives.",
    },
    {
      key: "eventUpdates" as const,
      label: "Event changes",
      description: "When the time or details of an event change.",
    },
    {
      key: "eventCancellations" as const,
      label: "Cancellations",
      description: "When an event is cancelled.",
    },
    {
      key: "eventReminders" as const,
      label: "Upcoming events",
      description: "Before a scheduled event begins.",
    },
  ];

  return (
    <div className="max-w-[896px] space-y-9">
      <SettingsSection
        title="Delivery"
        description="Choose where Needt can reach you. Browser notifications always require your permission."
      >
        <SettingsCard>
          <div className="flex min-h-[58px] items-center gap-3 px-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-control)]">
              <Mail className="h-4 w-4 text-[var(--text-secondary)]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-medium">
                Daily plan email
              </span>
              <span className="block text-[12px] text-[var(--text-secondary)]">
                A concise overview of meetings and tasks.
              </span>
            </span>
            <Switch
              checked={notifications.dailyEmailEnabled}
              onCheckedChange={(enabled) =>
                updateNotificationSettings({ dailyEmailEnabled: enabled })
              }
              aria-label="Daily plan email"
            />
          </div>
          <div className="flex min-h-[58px] items-center gap-3 border-t border-[var(--border-subtle)] px-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-control)]">
              <Monitor className="h-4 w-4 text-[var(--text-secondary)]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-medium">
                Browser notifications
              </span>
              <span className="block text-[12px] text-[var(--text-secondary)]">
                Focus endings and upcoming task reminders.
              </span>
            </span>
            <Switch
              checked={notifications.webPushEnabled}
              onCheckedChange={enablePush}
              aria-label="Browser notifications"
            />
          </div>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection
        title="Calendar alerts"
        description="Select which calendar changes should produce a notification."
      >
        <SettingsCard>
          {notificationRows.map((row, index) => (
            <div
              key={row.key}
              className="flex min-h-[58px] items-center gap-3 border-t border-[var(--border-subtle)] px-4 first:border-t-0"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-control)]">
                {index === 3 ? (
                  <CalendarClock className="h-4 w-4 text-[var(--text-secondary)]" />
                ) : (
                  <BellRing className="h-4 w-4 text-[var(--text-secondary)]" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium">
                  {row.label}
                </span>
                <span className="block text-[12px] text-[var(--text-secondary)]">
                  {row.description}
                </span>
              </span>
              <Switch
                checked={notifications.notifyFor[row.key]}
                onCheckedChange={(checked) =>
                  updateNotificationSettings({
                    notifyFor: {
                      ...notifications.notifyFor,
                      [row.key]: checked,
                    },
                  })
                }
                aria-label={row.label}
              />
            </div>
          ))}
        </SettingsCard>
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
