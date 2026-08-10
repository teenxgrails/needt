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
  await page.goto("/settings#theme", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
}

async function hideDevOverlays(page: import("@playwright/test").Page) {
  await page
    .locator("nextjs-portal, .tsqd-parent-container")
    .evaluateAll((elements) => elements.forEach((element) => element.remove()));
  await page.addStyleTag({
    content: "nextjs-portal, .tsqd-parent-container { display: none !important; }",
  });
}

async function waitForAutosave(page: import("@playwright/test").Page) {
  const retry = page.getByRole("button", { name: "Retry" });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.waitForTimeout(700);
    if (!(await retry.isVisible())) break;
    await retry.click();
  }
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
}

test("Today is a persistent daily document with a balanced timeline", async ({
  page,
}, testInfo) => {
  await page.clock.setFixedTime(new Date(VISUAL_TEST_NOW));
  await page.addInitScript(() => {
    localStorage.setItem("needt-visit-count", "0");
    localStorage.setItem("needt:quick-tip:last-shown-at", "9999999999999");
  });
  await signInVisualUser(page);
  await useTheme(page, "dark");
  const agendaResponse = await page.request.put("/api/daily-agenda", {
    data: {
      date: "2026-07-16",
      content: "<p>Write the one thing that would make today lighter.</p>",
    },
  });
  expect(agendaResponse.ok()).toBeTruthy();

  await page.goto("/today", { waitUntil: "domcontentloaded" });
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
  const editable = editor;
  await editable.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    (element as HTMLElement).focus();
  });
  await editable.press("Enter");
  await editable.type("/");
  const commands = page.getByRole("menu", { name: "Agenda commands" });
  await expect(commands).toBeVisible();
  await commands.getByRole("menuitem", { name: /New task/ }).click();
  const taskTitle = `Inline agenda task ${testInfo.project.name}`;
  await editable.type(taskTitle);
  await editable.press("Enter");
  await expect(editor.getByText(taskTitle).first()).toBeVisible();
  const agendaSave = page.waitForResponse(
    (response) =>
      response.url().includes("/api/daily-agenda") &&
      response.request().method() === "PUT" &&
      (response.request().postData() ?? "").includes("taskReference") &&
      response.ok()
  );
  await agendaSave;
  await expect(page.getByText("Saved")).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  const taskRow = page
    .getByLabel("Daily agenda notes")
    .locator('[data-type="taskReference"]')
    .filter({ hasText: taskTitle });
  await expect(taskRow).toBeVisible();
  await waitForAutosave(page);
  await hideDevOverlays(page);

  await expect(page).toHaveScreenshot("today-daily-document.png", {
    animations: "disabled",
  });
  await expect
    .poll(() =>
      page.evaluate(
        (date) => localStorage.getItem(`needt-agenda-draft:${date}`),
        "2026-07-16"
      )
    )
    .toBeNull();

  await useTheme(page, "light");
  await page.goto("/today", { waitUntil: "domcontentloaded" });
  await expect(taskRow).toBeVisible();
  await waitForAutosave(page);
  await hideDevOverlays(page);
  await expect(page).toHaveScreenshot("today-daily-document-light.png", {
    animations: "disabled",
  });

  await taskRow
    .getByRole("button", { name: taskTitle, exact: true })
    .click();
  const taskDialog = page.getByRole("dialog").filter({
    has: page.getByRole("textbox", { name: "Task name" }),
  });
  await expect(taskDialog).toBeVisible();
  await expect(
    taskDialog.getByRole("textbox", { name: "Task name" })
  ).toHaveValue(taskTitle);
  await page.keyboard.press("Escape");

  await taskRow.getByRole("button").last().click();
  const customDuration = page.getByLabel("Custom task duration");
  await customDuration.fill("45m");
  await customDuration.press("Enter");
  await expect(taskRow.getByRole("button", { name: "45m" })).toBeVisible();

  await taskRow
    .getByRole("button", { name: `Change date for ${taskTitle}` })
    .click();
  await page.getByRole("button", { name: /Tomorrow/ }).click();
  await page.getByRole("button", { name: "Done" }).click();
  await taskRow.getByRole("button", { name: `Complete ${taskTitle}` }).click();
  await expect(
    taskRow.getByRole("button", { name: `Reopen ${taskTitle}` })
  ).toBeVisible();
});

test("Today exposes agenda and task-create failures with retry", async ({
  page,
}, testInfo) => {
  await page.clock.setFixedTime(new Date(VISUAL_TEST_NOW));
  await page.addInitScript(() => {
    localStorage.setItem("needt:quick-tip:last-shown-at", "9999999999999");
  });
  await signInVisualUser(page);
  await useTheme(page, "dark");
  let failAgendaLoad = true;
  await page.route("**/api/daily-agenda?*", async (route) => {
    if (failAgendaLoad && route.request().method() === "GET") {
      failAgendaLoad = false;
      await route.fulfill({ status: 503, json: { error: "Unavailable" } });
      return;
    }
    await route.continue();
  });

  await page.goto("/today", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Could not load this agenda")).toBeVisible();
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Daily agenda notes")).toHaveAttribute(
    "contenteditable",
    "true"
  );

  let failTaskCreate = true;
  await page.route(/\/api\/tasks(?:\?.*)?$/, async (route) => {
    if (failTaskCreate && route.request().method() === "POST") {
      await route.fulfill({ status: 503, json: { error: "Unavailable" } });
      return;
    }
    await route.continue();
  });
  const editor = page.getByLabel("Daily agenda notes");
  const retryTitle = `Recovered task ${testInfo.project.name} ${Date.now()}`;
  await editor.click();
  await editor.press("Control+End");
  await editor.press("Enter");
  await editor.type(`/task ${retryTitle}`);
  await editor.press("Enter");
  await expect(editor).toContainText(`/task ${retryTitle}`);
  failTaskCreate = false;
  const restoredCommand = editor.getByText(`/task ${retryTitle}`, {
    exact: true,
  });
  await restoredCommand.evaluate((element) => {
    (element.closest('[contenteditable="true"]') as HTMLElement | null)?.focus();
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
  await editor.press("Enter");
  await expect(editor.getByText(retryTitle, { exact: true })).toHaveCount(1);
});

test("Today keeps both panes scrollable and pins 15-minute timeline edits", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop split-pane behavior");
  await page.clock.setFixedTime(new Date(VISUAL_TEST_NOW));
  await page.addInitScript(() => {
    localStorage.setItem("needt:quick-tip:last-shown-at", "9999999999999");
  });
  await signInVisualUser(page);
  await useTheme(page, "dark");
  const created = await page.request.post("/api/tasks", {
    data: {
      title: "Timeline drag target",
      status: "todo",
      duration: 60,
      estimatedMinutes: 60,
      startDate: "2026-07-16T00:00:00.000+02:00",
      dueDate: "2026-07-16T12:00:00.000+02:00",
      isAutoScheduled: true,
      autoScheduled: true,
      scheduleLocked: false,
      tagIds: [],
    },
  });
  expect(created.ok()).toBeTruthy();
  const createdTask = (await created.json()) as { id: string };
  const scheduledStart = "2026-07-16T11:00:00.000+02:00";
  const scheduledEnd = "2026-07-16T12:00:00.000+02:00";
  const update = await page.request.put(`/api/tasks/${createdTask.id}`, {
    data: {
      scheduledStart,
      scheduledEnd,
      scheduleLocked: true,
      isAutoScheduled: true,
    },
  });
  expect(update.ok()).toBeTruthy();

  await page.getByRole("link", { name: "Back to Needt" }).click();
  await page.getByRole("link", { name: "Today", exact: true }).click();
  await expect(page).toHaveURL(/\/today$/);
  const outerRoute = page.getByTestId("today-route-scroll");
  const documentPane = page.getByTestId("today-document-scroll");
  const timelinePane = page.getByTestId("today-timeline-scroll");
  const timeline = page.getByLabel("One day timeline");
  await expect(timeline).toBeVisible();
  await expect(documentPane).toHaveCSS("overflow-y", "auto");
  await expect(timelinePane).toHaveCSS("overflow-y", "auto");
  await expect(outerRoute).toHaveCSS("overflow-y", "hidden");

  await documentPane.evaluate((element) => {
    const content = element.firstElementChild as HTMLElement | null;
    if (content) content.style.minHeight = `${element.clientHeight + 800}px`;
    element.scrollTop = 180;
  });
  await timelinePane.evaluate((element) => {
    element.scrollTop = 420;
  });
  const independentScroll = await page.evaluate(() => ({
    outer: document.querySelector<HTMLElement>(
      '[data-testid="today-route-scroll"]'
    )?.scrollTop,
    document: document.querySelector<HTMLElement>(
      '[data-testid="today-document-scroll"]'
    )?.scrollTop,
    timeline: document.querySelector<HTMLElement>(
      '[data-testid="today-timeline-scroll"]'
    )?.scrollTop,
  }));
  expect(independentScroll.outer).toBe(0);
  expect(independentScroll.document).toBe(180);
  expect(independentScroll.timeline).toBe(420);

  await page.getByRole("link", { name: /Calendar/ }).click();
  await page.getByRole("link", { name: "Today", exact: true }).click();
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByTestId("today-timeline-scroll")).toHaveAttribute(
    "data-needt-scroll-anchor",
    "current-time"
  );
  const marker = page.getByTestId("today-current-time-marker");
  await expect(marker).toBeVisible();
  const markerBox = await marker.boundingBox();
  const timelineBox = await page
    .getByTestId("today-timeline-scroll")
    .boundingBox();
  expect(markerBox).not.toBeNull();
  expect(timelineBox).not.toBeNull();
  const markerRatio = (markerBox!.y - timelineBox!.y) / timelineBox!.height;
  expect(markerRatio).toBeGreaterThanOrEqual(0.25);
  expect(markerRatio).toBeLessThanOrEqual(0.4);

  const task = timeline.locator('[title^="Timeline drag target"]');
  await expect(task).toBeVisible();
  const box = await task.boundingBox();
  expect(box).not.toBeNull();
  const placementRequest = page.waitForResponse(
    (response) =>
      response.request().method() === "PUT" &&
      response.url().endsWith(`/api/tasks/${createdTask.id}`)
  );
  const pointer = {
    pointerId: 7,
    clientX: box!.x + box!.width / 2,
    clientY: box!.y + box!.height / 2,
  };
  await task.dispatchEvent("pointerdown", pointer);
  await task.dispatchEvent("pointermove", {
    ...pointer,
    clientY: pointer.clientY + 18,
  });
  await task.dispatchEvent("pointerup", {
    ...pointer,
    clientY: pointer.clientY + 18,
  });
  await expect(page.getByText("Task pinned")).toBeVisible();

  const moved = (await (await placementRequest).json()) as {
    scheduledStart: string;
    scheduleLocked: boolean;
    scheduledBlocks: Array<{ isFrozen: boolean }>;
  };
  expect(moved.scheduleLocked).toBe(true);
  expect(new Date(moved.scheduledStart).getMinutes()).toBe(15);
  expect(moved.scheduledBlocks[0]?.isFrozen).toBe(true);

  const resize = timeline.getByLabel("Resize Timeline drag target end");
  const resizeBox = await resize.boundingBox();
  expect(resizeBox).not.toBeNull();
  const resizeRequest = page.waitForResponse(
    (response) =>
      response.request().method() === "PUT" &&
      response.url().endsWith(`/api/tasks/${createdTask.id}`)
  );
  const resizePointer = {
    pointerId: 8,
    clientX: resizeBox!.x + resizeBox!.width / 2,
    clientY: resizeBox!.y + resizeBox!.height / 2,
  };
  await resize.dispatchEvent("pointerdown", resizePointer);
  await resize.dispatchEvent("pointermove", {
    ...resizePointer,
    clientY: resizePointer.clientY + 18,
  });
  await resize.dispatchEvent("pointerup", {
    ...resizePointer,
    clientY: resizePointer.clientY + 18,
  });
  await expect(page.getByText("Task duration updated")).toBeVisible();
  const resized = (await (await resizeRequest).json()) as {
    duration: number;
    estimatedMinutes: number;
    scheduledStart: string;
    scheduledEnd: string;
  };
  expect(resized.duration).toBe(75);
  expect(resized.estimatedMinutes).toBe(75);
  expect(new Date(resized.scheduledStart).getMinutes()).toBe(15);
  expect(new Date(resized.scheduledEnd).getMinutes()).toBe(30);
});
