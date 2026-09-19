import { expect, test } from "@playwright/test";

import { VISUAL_TEST_NOW } from "./fixtures";
import { signInVisualUser } from "./helpers";

async function prepare(page: import("@playwright/test").Page) {
  await page.clock.setFixedTime(new Date(VISUAL_TEST_NOW));
  await page.addInitScript(() => {
    localStorage.setItem("needt-visit-count", "0");
    localStorage.setItem("needt:quick-tip:last-shown-at", "9999999999999");
  });
  await signInVisualUser(page);
  const theme = await page.request.patch("/api/user-settings", {
    data: { theme: "dark" },
  });
  expect(theme.ok()).toBeTruthy();
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
}

test("Today binds real tasks and keeps completion after reload", async ({
  page,
}, testInfo) => {
  await prepare(page);
  const title = `Today production task ${testInfo.project.name}`;
  const created = await page.request.post("/api/tasks", {
    data: {
      title,
      status: "todo",
      duration: 30,
      estimatedMinutes: 30,
      dueDate: VISUAL_TEST_NOW,
      isAutoScheduled: false,
      autoScheduled: false,
      scheduleLocked: false,
      tagIds: [],
    },
  });
  expect(created.ok()).toBeTruthy();

  await page.goto("/today", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await expect(page.locator(".needt-v2")).toHaveAttribute("data-theme", "dark");

  await page.getByRole("button", { name: `Complete ${title}` }).click();
  await expect(
    page.getByRole("button", { name: `Reopen ${title}` })
  ).toBeVisible();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("button", { name: `Reopen ${title}` })
  ).toBeVisible();

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth
  );
  expect(overflow).toBe(false);
});

test("Today exposes load failures and recovers", async ({ page }) => {
  await prepare(page);
  let fail = true;
  await page.route("**/api/needt/today", async (route) => {
    if (fail) {
      fail = false;
      await route.fulfill({ status: 503, json: { error: "Unavailable" } });
      return;
    }
    await route.continue();
  });

  await page.goto("/today", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Today could not be loaded.")).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("Today could not be loaded.")).toBeHidden();
  await expect(page.getByText("Today", { exact: true }).first()).toBeVisible();
});
