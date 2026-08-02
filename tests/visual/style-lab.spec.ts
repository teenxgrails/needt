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

async function waitForStyleLab(page: import("@playwright/test").Page) {
  await expect(page.locator("html")).toHaveAttribute(
    "style",
    /--surface-canvas:/
  );
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(VISUAL_TEST_NOW));
  await page.addInitScript(() => {
    localStorage.setItem("needt:quick-tip:last-shown-at", "9999999999999");
    localStorage.setItem("needt-visit-count", "0");
  });
});

test("component laboratory stays coherent in dark mode", async ({ page }) => {
  await page.goto("/style", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Calm, dense, and deliberate." })
  ).toBeVisible();
  await waitForStyleLab(page);
  await expect(page.getByText("Button / variants")).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/theme-dark/);
  await expect(page.getByText("#202024").first()).toBeVisible();
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
  await waitForStyleLab(page);
  await page.getByRole("button", { name: "Light" }).click();
  await expect(page.getByRole("button", { name: "Light" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("html")).not.toHaveClass(/dark|theme-dark/);
  await expect(page.getByText("#f6f7fb").first()).toBeVisible();
  await settleVisualSurface(page);
  await expect(page).toHaveScreenshot("style-lab-light.png", {
    fullPage: true,
  });
});

test("component laboratory uses the product Graphite theme", async ({
  page,
}) => {
  await page.goto("/style", { waitUntil: "domcontentloaded" });
  await waitForStyleLab(page);
  await page.getByRole("button", { name: "Graphite" }).click();
  await expect(page.getByRole("button", { name: "Graphite" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await expect(page.locator("html")).toHaveClass(/theme-graphite/);
  await expect(page.getByText("#1a1d1e").first()).toBeVisible();
  await settleVisualSurface(page);
  await expect(page).toHaveScreenshot("style-lab-graphite.png", {
    fullPage: true,
  });
});

test("date and priority pickers keep their overlay depth", async ({ page }) => {
  await page.goto("/style#forms", { waitUntil: "domcontentloaded" });
  await waitForStyleLab(page);

  await page
    .getByRole("button", { name: "Preview the shared date picker" })
    .click();
  await settleVisualSurface(page);
  await expect(page).toHaveScreenshot("style-date-picker-open.png");
  await page.keyboard.press("Escape");

  // A mobile date picker is a modal bottom sheet. Reload the isolated lab
  // surface so its exit animation/focus trap cannot intercept the next picker.
  await page.goto("/style#forms", { waitUntil: "domcontentloaded" });
  await waitForStyleLab(page);

  await page.getByRole("combobox", { name: "Priority", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Search" })).toBeVisible();
  await settleVisualSurface(page);
  await expect(page).toHaveScreenshot("style-priority-picker-open.png");
});
