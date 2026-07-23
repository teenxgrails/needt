import { expect, test } from "@playwright/test";

import { VISUAL_TEST_NOW } from "./fixtures";
import { signInVisualUser } from "./helpers";

test("named schedules copy selected days and flexible hours stay background-only", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(VISUAL_TEST_NOW));
  await signInVisualUser(page);
  const scheduleName = `Regression schedule ${crypto.randomUUID().slice(0, 8)}`;
  const defaultSchedule = await page.request.get("/api/work-schedules");
  expect(defaultSchedule.ok()).toBeTruthy();

  const created = await page.request.post("/api/work-schedules", {
    data: {
      name: scheduleName,
      timeZone: "Europe/Zurich",
      windows: [
        {
          dayOfWeek: 1,
          startTime: "08:30",
          endTime: "12:00",
          sortOrder: 0,
        },
        {
          dayOfWeek: 1,
          startTime: "13:15",
          endTime: "17:45",
          sortOrder: 1,
        },
        {
          dayOfWeek: 3,
          startTime: "10:00",
          endTime: "16:00",
          sortOrder: 2,
        },
      ],
    },
  });
  expect(created.ok()).toBeTruthy();
  const createdSchedule = (await created.json()) as {
    schedule: { id: string };
  };

  await page.goto("/settings#schedules", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: new RegExp(scheduleName) }).click();
  await expect(
    page.getByRole("heading", { name: "Edit schedule" })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Mon 8:30 AM/ })).toHaveCount(
    1
  );
  await expect(page.getByRole("button", { name: /Mon 1:15 PM/ })).toHaveCount(
    1
  );

  await page.getByRole("button", { name: "Copy", exact: true }).nth(1).click();
  await page.getByLabel("Tue", { exact: true }).click();
  await page.getByLabel("Thu", { exact: true }).click();
  await page.getByRole("button", { name: "Copy hours" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Schedule saved")).toBeVisible();

  const schedulesResponse = await page.request.get("/api/work-schedules");
  const schedules = (await schedulesResponse.json()) as {
    schedules: Array<{
      name: string;
      windows: Array<{
        dayOfWeek: number;
        startTime: string;
        endTime: string;
      }>;
    }>;
  };
  const schedule = schedules.schedules.find(
    (item) => item.name === scheduleName
  );
  expect(
    schedule?.windows.filter((window) => window.dayOfWeek === 2)
  ).toMatchObject([
    { startTime: "08:30", endTime: "12:00" },
    { startTime: "13:15", endTime: "17:45" },
  ]);
  expect(
    schedule?.windows.filter((window) => window.dayOfWeek === 3)
  ).toMatchObject([{ startTime: "10:00", endTime: "16:00" }]);

  const override = await page.request.post("/api/flexible-hours", {
    data: { date: "2026-07-16", kind: "BLOCK_WHOLE_DAY" },
  });
  expect(override.ok()).toBeTruthy();
  await page.goto("/calendar", { waitUntil: "networkidle" });
  await expect(page.locator(".needt-flexible-hours-texture")).toHaveCount(1);
  await expect(page.getByText("Unavailable", { exact: true })).toHaveCount(0);
  await page.evaluate(() => {
    localStorage.setItem(
      "calendar-view-store",
      JSON.stringify({ state: { view: "day" }, version: 2 })
    );
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator(".calendar-day-view")).toBeVisible();
  await expect(page.locator(".needt-flexible-hours-texture")).toHaveCount(1);

  const reset = await page.request.delete(
    "/api/flexible-hours?date=2026-07-16"
  );
  expect(reset.ok()).toBeTruthy();
  const removed = await page.request.delete(
    `/api/work-schedules/${createdSchedule.schedule.id}`
  );
  expect(
    removed.ok(),
    `schedule delete returned ${removed.status()}: ${await removed.text()}`
  ).toBeTruthy();
});
