export const OFFLINE_SCHEMA_VERSION = 2;

export interface NeedtOfflineScope {
  userId: string;
  workspaceId: string;
  schemaVersion: typeof OFFLINE_SCHEMA_VERSION;
}

async function activeWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  const registration = await navigator.serviceWorker.getRegistration();
  return (
    navigator.serviceWorker.controller ||
    registration?.active ||
    registration?.waiting ||
    null
  );
}

export async function setNeedtOfflineScope(
  scope: Omit<NeedtOfflineScope, "schemaVersion">
) {
  const worker = await activeWorker();
  if (!worker) return;
  await postWithAck(worker, {
    type: "NEEDT_SET_OFFLINE_SCOPE",
    scope: { ...scope, schemaVersion: OFFLINE_SCHEMA_VERSION },
  });
}

async function postWithAck(worker: ServiceWorker, message: unknown) {
  if (typeof MessageChannel === "undefined") return;
  await new Promise<void>((resolve) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(resolve, 1500);
    channel.port1.onmessage = () => {
      window.clearTimeout(timeout);
      resolve();
    };
    worker.postMessage(message, [channel.port2]);
  });
}

function clearUserStorage() {
  if (typeof window === "undefined") return;
  const keys = new Set([
    "calendar-settings",
    "calendar-ui-store",
    "calendar-view-store",
    "duration-memory-store",
    "fluid-calendar-setup-storage",
    "fluid_calendar_logs",
    "focus-mode-storage",
    "focus-timer-storage",
    "lastBriefingAt",
    "log-view-store",
    "needt-ai-companion-position-v1",
    "needt-calendar-visibility",
    "needt-offline-user-id",
    "needt-task-defaults",
    "needt-task-templates",
    "project-store",
    "task-data-storage",
    "task-list-view-settings-v2",
    "task-page-settings",
    "task-urgency-store",
  ]);
  const prefixes = ["needt-page-draft:", "needt-agenda-draft:", "needt:board:"];
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (
      key &&
      (keys.has(key) || prefixes.some((prefix) => key.startsWith(prefix)))
    ) {
      localStorage.removeItem(key);
    }
  }
}

export async function clearNeedtOfflineData() {
  clearUserStorage();
  const worker = await activeWorker();
  if (!worker) return;
  await postWithAck(worker, { type: "NEEDT_CLEAR_OFFLINE_DATA" });
}
