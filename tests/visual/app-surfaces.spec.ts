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
  await settleVisualSurface(page);
  await expect(page).toHaveScreenshot("settings-appearance.png");
  await page.goto("/calendar", { waitUntil: "domcontentloaded" });

  await expect(page.locator(".fc-timegrid")).toBeVisible();
  await expect(
    page
      .getByTestId("calendar-task")
      .filter({ hasText: "Review calendar sync" })
  ).toBeVisible();
  await settleVisualSurface(page);
  await expect(page).toHaveScreenshot("calendar.png");

  await page.evaluate(() => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
    );
  });
  await expect(
    page.getByRole("dialog", { name: "Command Menu" })
  ).toBeVisible();
  await settleVisualSurface(page);
  await expect(page).toHaveScreenshot("command-palette.png");
  await page.keyboard.press("Escape");

  if ((page.viewportSize()?.width ?? 0) < 640) {
    await page.getByRole("button", { name: "Create task" }).click();
    await expect(page.getByTestId("task-modal")).toBeVisible();
    await settleVisualSurface(page);
    await expect(page).toHaveScreenshot("calendar-create-task.png");
    await page
      .getByTestId("task-modal")
      .getByRole("button", { name: /Cancel/ })
      .click();
    await expect(page.getByTestId("task-modal")).toBeHidden();

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
  if ((page.viewportSize()?.width ?? 0) < 640) {
    await expect(
      page.getByRole("heading", { name: "Thursday", level: 1 })
    ).toBeVisible();
    await expect(page.getByText("July 16th, 2026")).toBeVisible();
  } else {
    await expect(
      page.getByRole("heading", { name: "Thursday", level: 1 })
    ).toBeVisible();
  }
  await expect(
    page.getByRole("main").getByText("Plan the launch").first()
  ).toBeVisible();
  await settleVisualSurface(page);
  await expect(page).toHaveScreenshot("today.png");

  const pageList = await page.request.get("/api/pages");
  expect(pageList.ok()).toBeTruthy();
  const pagePayload = (await pageList.json()) as {
    pages: Array<{ id: string; title: string }>;
  };
  let visualPage = pagePayload.pages.find(
    (entry) => entry.title === "Visual design notes"
  );
  if (!visualPage) {
    const createResponse = await page.request.post("/api/pages", {
      data: { title: "Visual design notes", icon: "🎨" },
    });
    expect(createResponse.ok()).toBeTruthy();
    visualPage = (
      (await createResponse.json()) as {
        page: { id: string; title: string };
      }
    ).page;
  }
  await page.goto(`/pages/${visualPage.id}`, { waitUntil: "networkidle" });
  await expect(page.getByLabel("Page document")).toBeVisible();
  await settleVisualSurface(page);
  await expect(page).toHaveScreenshot("page-document.png");

  await page.goto("/tasks", { waitUntil: "domcontentloaded" });
  if ((page.viewportSize()?.width ?? 0) < 640) {
    await expect(page.getByText("Space is best on desktop")).toBeVisible();
  } else {
    await expect(page.getByText("Schedule stays unchanged")).toBeVisible();
  }
  await settleVisualSurface(page);
  await expect(page).toHaveScreenshot("space.png");

  if ((page.viewportSize()?.width ?? 0) >= 640) {
    await page.getByRole("button", { name: "Timeline" }).click();
    const ganttViewport = page.getByTestId("gantt-scroll-viewport");
    const ganttGrid = page.getByTestId("gantt-grid-background");
    await expect(ganttViewport).toBeVisible();
    await expect(ganttGrid).toBeVisible();

    const bottomGap = await page.evaluate(() => {
      const viewport = document
        .querySelector('[data-testid="gantt-scroll-viewport"]')
        ?.getBoundingClientRect();
      const grid = document
        .querySelector('[data-testid="gantt-grid-background"]')
        ?.getBoundingClientRect();
      if (!viewport || !grid) return Number.POSITIVE_INFINITY;
      return Math.abs(viewport.bottom - grid.bottom);
    });
    expect(bottomGap).toBeLessThanOrEqual(1);
    await expect(ganttViewport.getByText("Jun 2026")).toHaveCount(0);
  }
});

test("primary app surfaces stay coherent in light mode", async ({ page }) => {
  await page.clock.setFixedTime(new Date(VISUAL_TEST_NOW));
  await page.addInitScript(() => {
    localStorage.setItem("mina:quick-tip:last-shown-at", "9999999999999");
    localStorage.setItem("needt-visit-count", "0");
  });
  await signInVisualUser(page);
  await useVisualTheme(page, "light");
  await settleVisualSurface(page);
  await expect(page).toHaveScreenshot("settings-appearance-light.png");

  await page.goto("/calendar", { waitUntil: "networkidle" });
  await expect(page.locator(".fc-timegrid")).toBeVisible();
  await settleVisualSurface(page);
  await expect(page).toHaveScreenshot("calendar-light.png");

  await page.evaluate(() => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
    );
  });
  await expect(
    page.getByRole("dialog", { name: "Command Menu" })
  ).toBeVisible();
  await settleVisualSurface(page);
  await expect(page).toHaveScreenshot("command-palette-light.png");
  await page.keyboard.press("Escape");

  await page.goto("/today", { waitUntil: "networkidle" });
  if ((page.viewportSize()?.width ?? 0) < 640) {
    await expect(
      page.getByRole("heading", { name: "Thursday", level: 1 })
    ).toBeVisible();
    await expect(page.getByText("July 16th, 2026")).toBeVisible();
  } else {
    await expect(
      page.getByRole("heading", { name: "Thursday", level: 1 })
    ).toBeVisible();
  }
  await settleVisualSurface(page);
  await expect(page).toHaveScreenshot("today-light.png");

  await page.goto("/tasks", { waitUntil: "networkidle" });
  if ((page.viewportSize()?.width ?? 0) < 640) {
    await expect(page.getByText("Space is best on desktop")).toBeVisible();
  } else {
    await expect(page.getByText("Schedule stays unchanged")).toBeVisible();
  }
  await settleVisualSurface(page);
  await expect(page).toHaveScreenshot("space-light.png");
});
