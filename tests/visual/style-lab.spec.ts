import { expect, test } from "@playwright/test";

const VISUAL_TEST_NOW = "2026-07-22T10:00:00.000+02:00";

async function settleVisualSurface(page: import("@playwright/test").Page) {
  await page.addStyleTag({
    content:
      "nextjs-portal, .tsqd-parent-container { display: none !important; }",
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(250);
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(VISUAL_TEST_NOW));
  await page.addInitScript(() => {
    localStorage.setItem("mina:quick-tip:last-shown-at", "9999999999999");
    localStorage.setItem("needt-visit-count", "0");
  });
});

test("component laboratory stays coherent in dark mode", async ({ page }) => {
  await page.goto("/style", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Calm, dense, and deliberate." })
  ).toBeVisible();
  await expect(page.getByText("Button / variants")).toBeVisible();
  await settleVisualSurface(page);
  await expect(page).toHaveScreenshot("style-lab-dark.png", {
    fullPage: true,
  });
});

test("component laboratory stays coherent in light mode", async ({ page }) => {
  await page.goto("/style", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Calm, dense, and deliberate." })
  ).toBeVisible();
  await page.waitForTimeout(250);
  await page.getByRole("button", { name: "Light" }).click();
  await expect(page.getByRole("button", { name: "Light" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await expect(page.getByText("#f6f7fb").first()).toBeVisible();
  await settleVisualSurface(page);
  await expect(page).toHaveScreenshot("style-lab-light.png", {
    fullPage: true,
  });
});

test("date and priority pickers keep their overlay depth", async ({ page }) => {
  await page.goto("/style#forms", { waitUntil: "domcontentloaded" });

  await page
    .getByRole("button", { name: "Preview the shared date picker" })
    .click();
  await settleVisualSurface(page);
  await expect(page).toHaveScreenshot("style-date-picker-open.png");
  await page.keyboard.press("Escape");

  // A mobile date picker is a modal bottom sheet. Reload the isolated lab
  // surface so its exit animation/focus trap cannot intercept the next picker.
  await page.goto("/style#forms", { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "Priority", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Search" })).toBeVisible();
  await settleVisualSurface(page);
  await expect(page).toHaveScreenshot("style-priority-picker-open.png");
});
