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

  await expect(editor.locator("strong")).toHaveText("Rendered note");
  await expect(editor).not.toContainText("**Rendered note**");
});

test("task editor stays usable at every breakpoint", async ({ page }) => {
  await page.clock.setFixedTime(new Date(VISUAL_TEST_NOW));
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await signInVisualUser(page);
  const task = await findVisualTask(page);

  await page.goto(`/tasks?task=${task.id}`, {
    waitUntil: "domcontentloaded",
  });
  const modal = page.getByTestId("task-modal");
  await expect(modal).toBeVisible();
  await expect(modal.getByLabel("Task name")).toHaveValue("Morning deep work");
  await settleTaskEditor(page);
  await expect(page).toHaveScreenshot("task-editor.png");
});
