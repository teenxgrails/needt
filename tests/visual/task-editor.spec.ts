import { expect, test } from "@playwright/test";

import { VISUAL_TEST_NOW } from "./fixtures";
import { signInVisualUser } from "./helpers";

async function findVisualTask(page: import("@playwright/test").Page) {
  const tasksResponse = await page.request.get("/api/tasks");
  expect(tasksResponse.ok()).toBeTruthy();
  const tasks = (await tasksResponse.json()) as Array<{
    id: string;
    title: string;
  }>;
  const task = tasks.find(({ title }) => title === "Morning deep work");
  expect(task).toBeTruthy();
  return task!;
}

async function settleTaskEditor(page: import("@playwright/test").Page) {
  await page.addStyleTag({
    content:
      "nextjs-portal, .tsqd-parent-container { display: none !important; }",
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(250);
}

async function setVisualTheme(
  page: import("@playwright/test").Page,
  theme: "dark" | "light"
) {
  const response = await page.request.patch("/api/user-settings", {
    data: { theme },
  });
  expect(response.ok()).toBeTruthy();
  await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
  await page.goto("/settings#theme", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
}

test("task description formatting is rendered, not exposed as markup", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");

  await page.clock.setFixedTime(new Date(VISUAL_TEST_NOW));
  await signInVisualUser(page);

  const task = await findVisualTask(page);

  await page.goto(`/tasks?task=${task!.id}`, {
    waitUntil: "domcontentloaded",
  });
  const modal = page.getByTestId("task-modal");
  await expect(modal).toBeVisible();
  const editor = page.getByTestId("task-description-editor");
  await expect(
    editor.getByRole("heading", { name: "Focus block" })
  ).toBeVisible();
  await expect(editor.locator('ul[data-type="taskList"]')).toBeVisible();

  await editor.fill("Rendered note");
  await editor.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await modal.getByRole("button", { name: "Bold" }).click();

  await expect(
    editor.locator("strong").filter({ hasText: "Rendered note" })
  ).toHaveText(/Rendered note/);
  await expect(editor).not.toContainText("**Rendered note**");
  await expect(modal.getByText("Unsaved changes")).toBeVisible();
});

test("task editor stays usable at every breakpoint", async ({ page }) => {
  await page.clock.setFixedTime(new Date(VISUAL_TEST_NOW));
  await signInVisualUser(page);
  const task = await findVisualTask(page);

  for (const theme of ["dark", "light"] as const) {
    await setVisualTheme(page, theme);
    await page.goto(`/tasks?task=${task.id}`, {
      waitUntil: "domcontentloaded",
    });
    const modal = page.getByTestId("task-modal");
    await expect(modal).toBeVisible();
    await expect(modal.getByLabel("Task name")).toHaveValue(
      "Morning deep work"
    );
    await expect(
      modal.getByRole("heading", { name: "Focus block" })
    ).toBeVisible();
    await expect(modal.getByText("All changes saved")).toBeVisible();
    await settleTaskEditor(page);
    await expect(page).toHaveScreenshot(
      theme === "dark" ? "task-editor.png" : "task-editor-light.png"
    );

    await modal.getByRole("button", { name: "Choose task deadline" }).click();
    await expect(page.getByText("Choose a date").last()).toBeVisible();
    await settleTaskEditor(page);
    await expect(page).toHaveScreenshot(`task-date-picker-${theme}.png`);
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
  }
});

test("calendar plus opens the production event editor", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(VISUAL_TEST_NOW));
  await signInVisualUser(page);
  await page.goto("/calendar", { waitUntil: "domcontentloaded" });

  await expect(page.locator('[data-calendar-view="week"]')).toBeVisible();
  await page.getByRole("button", { name: "New event" }).click();
  const eventModal = page.getByRole("dialog");
  await expect(eventModal.getByRole("heading", { name: "New event" })).toBeVisible();
  await expect(eventModal.getByLabel("Title")).toBeVisible();
  await expect(eventModal.getByLabel("Starts")).toBeVisible();
  await expect(eventModal.getByLabel("Ends")).toBeVisible();
  await expect(eventModal.getByLabel("Notes")).toBeVisible();
  await settleTaskEditor(page);
  await expect(page).toHaveScreenshot("event-editor-production.png");
});
