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
  await page.goto("/settings#theme", { waitUntil: "networkidle" });
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

  await expect(editor.locator("strong")).toHaveText("Rendered note");
  await expect(editor).not.toContainText("**Rendered note**");
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

test("calendar plus opens Task directly and switches into the shared Event editor", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(VISUAL_TEST_NOW));
  await signInVisualUser(page);
  await page.goto("/calendar", { waitUntil: "domcontentloaded" });

  const todayHeader = page.locator(".fc-col-header-cell.fc-day-today");
  await expect(todayHeader).toContainText("Thu");
  await expect(todayHeader).toContainText("16");
  const dayAction = todayHeader.getByRole("button", {
    name: "Adjust task hours",
  });
  await expect(dayAction).toHaveCSS("opacity", "0");
  await todayHeader.hover();
  await expect(dayAction).toHaveCSS("opacity", "1");

  await page.getByRole("button", { name: "Create task" }).click();
  const taskModal = page.getByTestId("task-modal");
  await expect(taskModal).toBeVisible();
  await expect(taskModal.getByRole("tab", { name: "Task" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await taskModal.getByRole("tab", { name: "Event" }).click();

  const eventModal = page.getByTestId("event-modal");
  await expect(eventModal).toBeVisible();
  await expect(eventModal.getByRole("tab", { name: "Event" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await expect(eventModal.getByTestId("task-description-editor")).toBeVisible();
  await expect(
    eventModal.getByRole("button", { name: "Choose event start" })
  ).toBeVisible();
  await expect(
    eventModal.getByRole("button", { name: "Choose event end" })
  ).toBeVisible();
  await expect(eventModal.getByText("All changes saved")).toBeVisible();
  await settleTaskEditor(page);
  await expect(page).toHaveScreenshot("event-editor-shared.png");
});
