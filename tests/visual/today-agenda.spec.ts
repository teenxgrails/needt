import { expect, test } from "@playwright/test";

import { VISUAL_TEST_NOW } from "./fixtures";
import { signInVisualUser } from "./helpers";

async function useTheme(
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

test("Today is a persistent daily document with a balanced timeline", async ({
  page,
}, testInfo) => {
  await page.clock.setFixedTime(new Date(VISUAL_TEST_NOW));
  await page.addInitScript(() => {
    localStorage.setItem("needt-visit-count", "0");
    localStorage.setItem("mina:quick-tip:last-shown-at", "9999999999999");
  });
  await signInVisualUser(page);
  await useTheme(page, "dark");
  await page.request.put("/api/daily-agenda", {
    data: {
      date: "2026-07-16",
      content: "<p>Write the one thing that would make today lighter.</p>",
    },
  });

  await page.goto("/today", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: "Thursday", level: 1 })
  ).toBeVisible();
  await expect(page.getByLabel("Daily agenda notes")).toContainText(
    "Write the one thing"
  );
  if (testInfo.project.name === "desktop") {
    await expect(page.getByLabel("One day timeline")).toBeVisible();
  } else {
    await expect(page.getByLabel("One day timeline")).toBeHidden();
  }

  const editor = page.getByLabel("Daily agenda notes");
  await editor.click();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  const taskTitle = `Inline agenda task ${testInfo.project.name}`;
  await page.keyboard.type(`/task ${taskTitle}`);
  await page.keyboard.press("Enter");
  await expect(editor.getByText(taskTitle)).toBeVisible();
  await expect(page.getByText("Saved")).toBeVisible();

  await page.reload({ waitUntil: "networkidle" });
  await expect(
    page.getByLabel("Daily agenda notes").getByText(taskTitle)
  ).toBeVisible();
  await expect(page).toHaveScreenshot("today-daily-document.png", {
    animations: "disabled",
  });

  await useTheme(page, "light");
  await page.goto("/today", { waitUntil: "networkidle" });
  await expect(
    page.getByLabel("Daily agenda notes").getByText(taskTitle)
  ).toBeVisible();
  await expect(page).toHaveScreenshot("today-daily-document-light.png", {
    animations: "disabled",
  });
});
