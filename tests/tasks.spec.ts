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

test("Capacity preview is reversible and task views persist", async ({ page }) => {
  const secret = process.env.NEXTAUTH_SECRET;
  expect(secret, "NEXTAUTH_SECRET is required for the tasks E2E test").toBeTruthy();
  const token = await encode({
    secret: secret!,
    maxAge: 60 * 60,
    token: { sub: "schedule-e2e-user", email: "schedule-e2e@needt.local", role: "admin" },
  });
  await page.context().addCookies([
    { name: "next-auth.session-token", value: token, url: process.env.TEST_BASE_URL ?? "http://localhost:3000", httpOnly: true, sameSite: "Lax" },
  ]);
  await page.addInitScript(() => {
    localStorage.setItem("task-page-settings", JSON.stringify({ state: { viewMode: "list" }, version: 0 }));
  });

  let savedViewPayload: unknown;
  let appliedPreviewToken: string | null = null;
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === "/api/auth/session") {
      return route.fulfill({
        json: {
          user: { id: "schedule-e2e-user", email: "schedule-e2e@needt.local", role: "admin" },
          expires: "2026-08-24T00:00:00.000Z",
        },
      });
    }
    if (url.pathname === "/api/workspaces") {
      return route.fulfill({
        json: {
          workspaces: [
            {
              role: "OWNER",
              workspace: {
                id: "schedule-workspace-e2e",
                name: "Schedule workspace",
                kind: "PERSONAL",
                createdAt: "2026-08-01T00:00:00.000Z",
              },
            },
          ],
        },
      });
    }
    if (url.pathname === "/api/tasks") return route.fulfill({ json: [] });
    if (url.pathname === "/api/tasks/capacity") {
      return route.fulfill({ json: { availableMinutes: 1200, calendarBusyMinutes: 300, demandMinutes: 480, overflowMinutes: 0, scheduledMinutes: 480, workingMinutes: 1500 } });
    }
    if (url.pathname === "/api/tasks/reschedule-preview") {
      const body = JSON.parse(request.postData() ?? "{}");
      if (body.action === "preview") {
        return route.fulfill({ json: { previewToken: "preview-e2e", changes: [{ taskId: "task-1", title: "Schedule launch", fromStart: null, toStart: "2026-08-10T09:00:00.000Z", explanation: "Fits available time", score: null }], unscheduled: [] } });
      }
      appliedPreviewToken = body.token;
      return route.fulfill({ json: { undoToken: "undo-e2e" } });
    }
    if (url.pathname === "/api/saved-views") {
      if (request.method() === "POST") {
        savedViewPayload = JSON.parse(request.postData() ?? "{}");
        return route.fulfill({ json: { id: "saved-view-e2e" } });
      }
      return route.fulfill({ json: { views: [] } });
    }
    return route.fulfill({ json: [] });
  });

  await page.goto("/tasks");
  await expect(page.getByText("20h available")).toBeVisible();
  await page.getByRole("button", { name: "Preview schedule" }).click();
  await expect(page.getByText("Preview: 1 schedule changes")).toBeVisible();
  await expect(page.getByText("Schedule launch")).toBeVisible();
  await page.getByRole("button", { name: "Apply" }).click();
  await expect.poll(() => appliedPreviewToken).toBe("preview-e2e");
  await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();

  await page.getByRole("button", { name: "Views", exact: true }).click();
  await page.getByText("Save current view").click();
  await page.getByLabel("Name").fill("Launch week");
  await page.getByRole("button", { name: "Save view" }).click();
  await expect.poll(() => savedViewPayload).toMatchObject({ name: "Launch week", resource: "TASKS", visibility: "PERSONAL" });
});
