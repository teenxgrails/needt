import { expect, test } from "@playwright/test";

import { VISUAL_TEST_NOW } from "./fixtures";
import { signInVisualUser } from "./helpers";

const THEMES = ["light", "gray", "dark"] as const;

test("Light, Gray and Dark keep their palettes at every breakpoint", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.clock.setFixedTime(new Date(VISUAL_TEST_NOW));
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await signInVisualUser(page);

  const resetResponse = await page.request.patch("/api/user-settings", {
    data: { theme: "light" },
  });
  expect(resetResponse.ok()).toBeTruthy();
  await page.goto("/settings#theme", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Monday", { exact: true })).toBeVisible();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  for (const theme of THEMES) {
    const themeRow = page.getByText("Theme:", { exact: true }).locator("..");
    await themeRow.getByRole("button").click();
    await page
      .getByRole("option", {
        name: theme === "gray" ? "Gray" : theme === "dark" ? "Dark" : "Light",
        exact: true,
      })
      .last()
      .click();
    const root = page.locator("html");
    await expect(root).toHaveAttribute("data-theme", theme);

    await page.addStyleTag({
      content:
        'nextjs-portal, .tsqd-parent-container, aside[aria-label="Quick Tip"] { display: none !important; }',
    });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await page.waitForTimeout(250);
    await expect(page).toHaveScreenshot(`theme-${theme}.png`);
  }
});
