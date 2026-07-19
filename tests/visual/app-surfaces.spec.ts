import { expect, test } from "@playwright/test";

import { VISUAL_TEST_NOW } from "./fixtures";
import { signInVisualUser } from "./helpers";

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

async function useVisualTheme(
  page: import("@playwright/test").Page,
  theme: "dark" | "light"
) {
  const response = await page.request.patch("/api/user-settings", {
    data: { theme },
  });
  expect(response.ok()).toBeTruthy();
  await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
  await page.goto("/settings#theme", { waitUntil: "networkidle" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
}

test("Calendar, Today, and Space stay visually stable", async ({ page }) => {
  await page.clock.setFixedTime(new Date(VISUAL_TEST_NOW));
  await page.addInitScript(() => {
    localStorage.setItem("mina:quick-tip:last-shown-at", String(Date.now()));
    localStorage.setItem("needt-visit-count", "0");
  });
  await signInVisualUser(page);
  await useVisualTheme(page, "dark");
  await page.goto("/calendar", { waitUntil: "domcontentloaded" });

  await expect(page.locator(".fc-timegrid")).toBeVisible();
  await expect(
    page
      .getByTestId("calendar-task")
      .filter({ hasText: "Review calendar sync" })
  ).toBeVisible();
  await settleVisualSurface(page);
  await expect(page).toHaveScreenshot("calendar.png");

  if ((page.viewportSize()?.width ?? 0) < 640) {
    await page.getByRole("button", { name: "Create task or event" }).click();
    await expect(page.getByRole("heading", { name: "Create" })).toBeVisible();
    await settleVisualSurface(page);
    await expect(page).toHaveScreenshot("calendar-create-sheet.png");
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "More calendar actions" }).click();
    await expect(
      page.getByRole("heading", { name: "Calendar options" })
    ).toBeVisible();
    await settleVisualSurface(page);
    await expect(page).toHaveScreenshot("calendar-options-sheet.png");
    await page.keyboard.press("Escape");
  } else {
    await page.getByTitle("Calendar options").click();
    await expect(page.getByRole("heading", { name: "Calendar" })).toBeVisible();
    await settleVisualSurface(page);
    await expect(page).toHaveScreenshot("calendar-options.png");
    await page.keyboard.press("Escape");
  }

  await page.goto("/today", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: /Thu.*Jul 16/, level: 1 })
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByText("Plan the launch").first()
  ).toBeVisible();
  await settleVisualSurface(page);
  await expect(page).toHaveScreenshot("today.png");

  await page.goto("/tasks", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Schedule stays unchanged")).toBeVisible();
  await settleVisualSurface(page);
  await expect(page).toHaveScreenshot("space.png");

  await page.goto("/style", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Calm, dense, and deliberate." })
  ).toBeVisible();
  await settleVisualSurface(page);
  await expect(page).toHaveScreenshot("style-system.png", {
    fullPage: true,
  });
});

test("primary app surfaces stay coherent in light mode", async ({ page }) => {
  await page.clock.setFixedTime(new Date(VISUAL_TEST_NOW));
  await page.addInitScript(() => {
    localStorage.setItem("mina:quick-tip:last-shown-at", "9999999999999");
    localStorage.setItem("needt-visit-count", "0");
  });
  await signInVisualUser(page);
  await useVisualTheme(page, "light");

  await page.goto("/calendar", { waitUntil: "networkidle" });
  await expect(page.locator(".fc-timegrid")).toBeVisible();
  await settleVisualSurface(page);
  await expect(page).toHaveScreenshot("calendar-light.png");

  await page.goto("/today", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: /Thu.*Jul 16/, level: 1 })
  ).toBeVisible();
  await settleVisualSurface(page);
  await expect(page).toHaveScreenshot("today-light.png");

  await page.goto("/tasks", { waitUntil: "networkidle" });
  await expect(page.getByText("Schedule stays unchanged")).toBeVisible();
  await settleVisualSurface(page);
  await expect(page).toHaveScreenshot("space-light.png");

  await page.goto("/style", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: "Calm, dense, and deliberate." })
  ).toBeVisible();
  await settleVisualSurface(page);
  await expect(page).toHaveScreenshot("style-system-light.png", {
    fullPage: true,
  });
});
