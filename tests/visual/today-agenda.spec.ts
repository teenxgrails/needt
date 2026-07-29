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
  await expect(page.getByText("Saved")).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByLabel("Daily agenda notes").getByText(taskTitle).first()
  ).toBeVisible();
  await expect(page).toHaveScreenshot("today-daily-document.png", {
    animations: "disabled",
  });

  await useTheme(page, "light");
  await page.goto("/today", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByLabel("Daily agenda notes").getByText(taskTitle).first()
  ).toBeVisible();
  await expect(page).toHaveScreenshot("today-daily-document-light.png", {
    animations: "disabled",
  });
});

test("Today keeps both panes scrollable and pins 15-minute timeline edits", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop split-pane behavior");
  await page.clock.setFixedTime(new Date(VISUAL_TEST_NOW));
  await signInVisualUser(page);
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

  await page.goto("/today", { waitUntil: "domcontentloaded" });
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

  await page.reload({ waitUntil: "domcontentloaded" });
  const marker = page.getByTestId("today-current-time-marker");
  await expect(marker).toBeVisible();
  const markerBox = await marker.boundingBox();
  const timelineBox = await page
    .getByTestId("today-timeline-scroll")
    .boundingBox();
  expect(markerBox).not.toBeNull();
  expect(timelineBox).not.toBeNull();
  const markerRatio =
    (markerBox!.y - timelineBox!.y) / timelineBox!.height;
  expect(markerRatio).toBeGreaterThanOrEqual(0.25);
  expect(markerRatio).toBeLessThanOrEqual(0.35);

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
