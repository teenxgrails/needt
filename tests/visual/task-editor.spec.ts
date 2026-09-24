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

test("production task details stay usable at every breakpoint", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(VISUAL_TEST_NOW));
  await signInVisualUser(page);
  const task = await findVisualTask(page);

  await page.goto(`/tasks?task=${task.id}`, { waitUntil: "domcontentloaded" });
  const dialog = page.getByTestId("task-modal");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Task name")).toHaveValue(task.title);
  if ((page.viewportSize()?.width ?? 0) >= 640) {
    await expect(
      dialog.getByRole("button", { name: "Template" })
    ).toBeDisabled();
    await expect(
      dialog.getByRole("button", { name: "Recurring" })
    ).toBeDisabled();
  }
  await settleTaskEditor(page);
  await expect(page).toHaveScreenshot("task-editor-production.png");
});

test("calendar plus opens the production event editor", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  await page.clock.setFixedTime(new Date(VISUAL_TEST_NOW));
  await signInVisualUser(page);
  await page.goto("/calendar", { waitUntil: "domcontentloaded" });

  await expect(page.locator('[data-calendar-view="week"]')).toBeVisible();
  await page.getByRole("button", { name: "New event" }).click();
  const eventModal = page.getByRole("dialog");
  await expect(
    eventModal.getByRole("heading", { name: "New event" })
  ).toBeVisible();
  await expect(eventModal.getByLabel("Title")).toBeVisible();
  await expect(eventModal.getByLabel("Starts")).toBeVisible();
  await expect(eventModal.getByLabel("Ends")).toBeVisible();
  await expect(eventModal.getByLabel("Notes")).toBeVisible();
  await settleTaskEditor(page);
  await expect(page).toHaveScreenshot("event-editor-production.png");
});
