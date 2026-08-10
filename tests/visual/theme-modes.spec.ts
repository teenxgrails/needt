import { expect, test } from "@playwright/test";

import { VISUAL_TEST_NOW } from "./fixtures";
import { signInVisualUser } from "./helpers";

const THEMES = ["light", "graphite", "dark"] as const;

test("Light, Graphite and Dark keep their palettes at every breakpoint", async ({
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
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("combobox", { name: "Theme" })).toHaveText(
    "Light"
  );

  for (const theme of THEMES) {
    const themeRow = page.getByText("Theme:", { exact: true }).locator("..");
    await themeRow.getByRole("combobox").click();
    await page
      .getByRole("option", {
        name:
          theme === "graphite"
            ? "Graphite"
            : theme === "dark"
              ? "Dark"
              : "Light",
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
