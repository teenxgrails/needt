import { expect, test } from "@playwright/test";

import { VISUAL_TEST_NOW } from "./fixtures";
import { signInVisualUser } from "./helpers";

const SETTINGS_TABS = [
  ["calendars", "Calendars"],
  ["auto-scheduling", "Auto-scheduling"],
  ["task-defaults", "Task defaults"],
  ["theme", "Appearance"],
  ["timezone", "Timezone"],
  ["notifications", "Notifications"],
  ["schedules", "Schedules"],
  ["desktop", "Desktop app"],
  ["integrations", "Integrations"],
  ["api", "API"],
  ["privacy", "Privacy"],
  ["ai", "AI Assistant"],
  ["account", "Account settings"],
  ["billing", "Billing"],
] as const;

async function settleSettings(page: import("@playwright/test").Page) {
  await page.addStyleTag({
    content:
      "nextjs-portal, .tsqd-parent-container { display: none !important; }",
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(350);
}

test("every Settings tab stays visually consistent", async ({ page }) => {
  await page.clock.setFixedTime(new Date(VISUAL_TEST_NOW));
  await page.addInitScript(() => {
    // Keep the delayed command-palette hint out of long screenshot matrices.
    // A far-future value remains valid across Playwright's fixed clock setup.
    localStorage.setItem("mina:quick-tip:last-shown-at", "9999999999999");
    localStorage.setItem("needt-visit-count", "0");
  });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await signInVisualUser(page);
  const themeResponse = await page.request.patch("/api/user-settings", {
    data: { theme: "dark" },
  });
  expect(themeResponse.ok()).toBeTruthy();

  for (const [tab, label] of SETTINGS_TABS) {
    await page.goto(`/settings#${tab}`, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(new RegExp(`#${tab}$`));

    if ((page.viewportSize()?.width ?? 0) >= 1024) {
      await expect(
        page.getByRole("heading", { name: label, level: 1 })
      ).toBeVisible();
    } else {
      await expect(
        page.getByRole("combobox", { name: "Settings page" })
      ).toContainText(label);
    }

    await settleSettings(page);
    await expect(page).toHaveScreenshot(`settings-${tab}.png`);
  }
});
