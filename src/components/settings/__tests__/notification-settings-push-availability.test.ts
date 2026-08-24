import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Notification settings push availability", () => {
  const source = readFileSync(
    join(process.cwd(), "src/components/settings/NotificationSettings.tsx"),
    "utf8"
  );
  const normalizedSource = source.replace(/\s+/g, " ");

  it("disables Web Push and explains the unavailable state", () => {
    expect(source).toContain("disabled={!notifications.webPushConfigured}");
    expect(normalizedSource).toContain(
      "Push delivery setup is incomplete on this Needt server. Browser notifications are unavailable. Email reminders still work."
    );
  });
});
