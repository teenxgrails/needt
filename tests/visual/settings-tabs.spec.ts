import { expect, test } from "@playwright/test";

import { VISUAL_TEST_NOW } from "./fixtures";
import { signInVisualUser } from "./helpers";

const SETTINGS_TABS = [
  ["calendars", "Calendars"],
  ["auto-scheduling", "Auto-scheduling"],
  ["task-defaults", "Task defaults"],
  ["theme", "Appearance"],
  ["timezone", "Timezone"],
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
      'nextjs-portal, .tsqd-parent-container, aside[aria-label="Quick Tip"] { display: none !important; }',
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await expect(page.locator(".animate-pulse, .glass-skeleton")).toHaveCount(0, {
    timeout: 15_000,
  });
  await page.waitForTimeout(350);
}

async function prepareSettings(page: import("@playwright/test").Page) {
  await page.clock.setFixedTime(new Date(VISUAL_TEST_NOW));
  await page.addInitScript(() => {
    // Keep the delayed command-palette hint out of long screenshot matrices.
    // A far-future value remains valid across Playwright's fixed clock setup.
    localStorage.setItem("needt:quick-tip:last-shown-at", "9999999999999");
    localStorage.setItem("needt-visit-count", "0");
  });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await signInVisualUser(page);
  const themeResponse = await page.request.patch("/api/user-settings", {
    data: { theme: "dark" },
  });
  expect(themeResponse.ok()).toBeTruthy();
}

test("every Settings tab stays visually consistent", async ({ page }) => {
  test.setTimeout(360_000);
  await prepareSettings(page);

  for (const [tab, label] of SETTINGS_TABS) {
    await page.goto(`/settings#${tab}`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(new RegExp(`#${tab}$`));

    await expect(
      page.getByRole("heading", { name: label, level: 1 })
    ).toBeVisible();

    if (tab === "billing") {
      await expect(
        page
          .getByText("Choose a plan", { exact: true })
          .or(page.getByText("Billing details are temporarily unavailable"))
      ).toBeVisible();
    }

    await settleSettings(page);
    await expect(page).toHaveScreenshot(`settings-${tab}.png`);
  }
});

test("unavailable browser push stays honest in Settings", async ({ page }) => {
  await prepareSettings(page);
  await page.goto("/settings#notifications", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/#notifications$/);
  await expect(
    page.getByRole("heading", { name: "Notifications", level: 1 })
  ).toBeVisible();

  const browserNotifications = page
    .getByText("Browser notifications:", { exact: true })
    .locator("..")
    .getByRole("switch");
  await expect(browserNotifications).toBeDisabled();
  await expect(browserNotifications).toHaveAttribute("aria-checked", "false");
  await expect(
    page.getByText(
      "Push delivery setup is incomplete on this Needt server. Browser notifications are unavailable. Email reminders still work."
    )
  ).toBeVisible();

  await settleSettings(page);
  await expect(page).toHaveScreenshot("settings-notifications.png");
});
