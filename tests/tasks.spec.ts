import { existsSync } from "node:fs";

import { expect, test } from "@playwright/test";
import { encode } from "next-auth/jwt";

if (!process.env.NEXTAUTH_SECRET && existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

const archivedTask = {
  id: "archived-task",
  userId: "archive-e2e-user",
  title: "Archived planning task",
  description: null,
  status: "todo",
  createdAt: "2026-08-04T08:00:00.000Z",
  updatedAt: "2026-08-04T08:00:00.000Z",
  archivedAt: "2026-08-04T08:00:00.000Z",
  isArchived: true,
  isRecurring: false,
  isAutoScheduled: false,
  scheduleLocked: false,
  tags: [],
  project: null,
};

test("Archived tasks are read-only and can be restored", async ({ page }) => {
  const secret = process.env.NEXTAUTH_SECRET;
  expect(secret, "NEXTAUTH_SECRET is required for the tasks E2E test").toBeTruthy();
  const token = await encode({
    secret: secret!,
    maxAge: 60 * 60,
    token: {
      sub: archivedTask.userId,
      email: "archive-e2e@needt.local",
      role: "admin",
    },
  });
  await page.context().addCookies([
    {
      name: "next-auth.session-token",
      value: token,
      url: process.env.TEST_BASE_URL ?? "http://localhost:3000",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await page.addInitScript(() => {
    localStorage.setItem(
      "task-page-settings",
      JSON.stringify({ state: { viewMode: "archived" }, version: 0 })
    );
  });

  let restorePayload: unknown;
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === "/api/tasks" && url.searchParams.has("archived")) {
      await route.fulfill({ json: [archivedTask] });
      return;
    }
    if (
      url.pathname === `/api/tasks/${archivedTask.id}` &&
      request.method() === "PUT"
    ) {
      restorePayload = JSON.parse(request.postData() ?? "{}");
      await route.fulfill({ json: { ...archivedTask, isArchived: false } });
      return;
    }
    if (url.pathname === "/api/tasks/schedule-all") {
      await route.fulfill({
        json: {
          status: "SUCCEEDED",
          changedTaskCount: 0,
          unscheduled: [],
        },
      });
      return;
    }
    await route.fulfill({ json: [] });
  });

  await page.goto("/tasks");
  await expect(page.getByText(archivedTask.title)).toBeVisible();
  await expect(
    page.getByRole("button", { name: `Complete ${archivedTask.title}` })
  ).toHaveCount(0);

  await page.getByRole("button", { name: `Restore ${archivedTask.title}` }).click();

  await expect.poll(() => restorePayload).toEqual({ isArchived: false });
  await expect(page.getByText(archivedTask.title)).toHaveCount(0);
});
