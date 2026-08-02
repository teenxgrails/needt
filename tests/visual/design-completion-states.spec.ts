import { expect, test } from "@playwright/test";

import { signInVisualUser } from "./helpers";

const EVENING_NOW = "2026-07-16T19:30:00+02:00";

async function prepareAuthenticatedPage(page: import("@playwright/test").Page) {
  await page.clock.setFixedTime(new Date(EVENING_NOW));
  await page.addInitScript(() => {
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

async function settle(page: import("@playwright/test").Page) {
  await page.addStyleTag({
    content:
      "nextjs-portal, .tsqd-parent-container { display: none !important; }",
  });
  await page.evaluate(async () => document.fonts.ready);
  await expect(page.locator(".animate-pulse")).toHaveCount(0);
  await page.waitForTimeout(250);
}

test("Today exposes the responsive timeline and explicit evening review", async ({
  page,
}, testInfo) => {
  await prepareAuthenticatedPage(page);
  const agendaResponse = await page.request.put("/api/daily-agenda", {
    data: {
      date: "2026-07-16",
      content: "<p>Close the day with an intentional review.</p>",
    },
  });
  expect(agendaResponse.ok()).toBeTruthy();

  await page.goto("/today", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Thursday", level: 1 })
  ).toBeVisible();
  await expect(page.getByText("Evening review", { exact: true })).toBeVisible();

  if (testInfo.project.name === "desktop") {
    await expect(page.getByLabel("One day timeline")).toBeVisible();
  } else {
    await expect(page.getByLabel("One day timeline")).toBeHidden();
    await page.getByRole("button", { name: "Open day calendar" }).click();
    await expect(
      page.getByRole("dialog", { name: "Day calendar" })
    ).toBeVisible();
    await expect(
      page
        .getByRole("dialog", { name: "Day calendar" })
        .getByLabel("One day timeline")
    ).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot("today-calendar-sheet.png");
    await page.keyboard.press("Escape");
  }

  await page.getByRole("button", { name: "Review", exact: true }).click();
  const review = page.getByRole("dialog", { name: "Evening review" });
  await expect(review).toBeVisible();
  await expect(review.getByText("Morning deep work")).toBeVisible();
  await expect(
    review.getByRole("button", { name: "Move to tomorrow" })
  ).toBeDisabled();
  await review.getByText("Morning deep work").click();
  await expect(
    review.getByRole("button", { name: "Move to tomorrow" })
  ).toBeEnabled();
  await settle(page);
  await expect(page).toHaveScreenshot("today-evening-review.png");
});

test("Integrations empty search and private bug report dialog stay usable", async ({
  page,
}) => {
  await prepareAuthenticatedPage(page);
  await page.goto("/settings#integrations", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Integrations", level: 1 })
  ).toBeVisible();
  const search = page.getByPlaceholder("Search integrations");
  await expect(search).toBeVisible();
  await search.fill("no-such-integration");
  await expect(page.getByText("No matching integrations.")).toBeVisible();
  await settle(page);
  await expect(page).toHaveScreenshot("settings-integrations-empty.png");

  const backToSettings = page.getByRole("button", {
    name: "Back to Settings",
  });
  if (await backToSettings.isVisible()) {
    await backToSettings.click();
  }
  const reportTrigger = page.getByRole("button", { name: "Report a bug" });
  await reportTrigger.click();
  const report = page.getByRole("dialog", { name: "Report a bug" });
  await expect(report).toBeVisible();
  await expect(
    report.getByRole("combobox", { name: "Severity" })
  ).toContainText("Medium");
  await expect(
    report.getByText("Page content and logs are never")
  ).toBeVisible();
  await settle(page);
  await expect(page).toHaveScreenshot("settings-report-bug.png");
});
