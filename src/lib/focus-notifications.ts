"use client";

/**
 * Browser notifications for focus-session end, with a graceful no-op when the
 * API is unavailable or permission is denied. Callers pair this with an in-app
 * toast so users still get feedback when notifications are off.
 */

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** Request permission once, on first session start. Safe to call repeatedly. */
export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export function notifyFocusComplete(title: string, body: string): void {
  if (!notificationsSupported() || Notification.permission !== "granted") {
    return;
  }
  try {
    new Notification(title, { body, tag: "needt-focus" });
  } catch {
    // Some browsers require a service-worker registration to show
    // notifications; the in-app toast fallback covers that case.
  }
}
