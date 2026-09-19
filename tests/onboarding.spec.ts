import { executeSchedulingRun } from "@/services/scheduling/runs";
import { type Page, expect, test } from "@playwright/test";
import { createHash } from "node:crypto";

import {
  addCalendarDays,
  calendarDayDifference,
  newDate,
} from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";

const runId = `${process.pid}-${newDate().getTime()}`;
const createdEmails: string[] = [];
let originalFirstRunSettings:
  | {
      publicSignup: boolean;
      requireEmailVerificationBeforeAccess: boolean;
    }
  | null
  | undefined;

async function enablePublicFirstRun() {
  originalFirstRunSettings = await prisma.systemSettings.findUnique({
    where: { id: "default" },
    select: {
      publicSignup: true,
      requireEmailVerificationBeforeAccess: true,
    },
  });
  await prisma.systemSettings.upsert({
    where: { id: "default" },
    update: {
      publicSignup: true,
      requireEmailVerificationBeforeAccess: false,
    },
    create: {
      id: "default",
      publicSignup: true,
      requireEmailVerificationBeforeAccess: false,
    },
  });
}

async function restoreFirstRunSettings() {
  if (originalFirstRunSettings === undefined) return;
  if (originalFirstRunSettings === null) {
    await prisma.systemSettings.deleteMany({ where: { id: "default" } });
    return;
  }
  await prisma.systemSettings.update({
    where: { id: "default" },
    data: originalFirstRunSettings,
  });
}

async function cleanupCreatedUsers() {
  const users = await prisma.user.findMany({
    where: { email: { in: createdEmails } },
    select: { id: true, personalWorkspace: { select: { id: true } } },
  });
  const userIds = users.map(({ id }) => id);
  const workspaceIds = users.flatMap(({ personalWorkspace }) =>
    personalWorkspace ? [personalWorkspace.id] : []
  );

  await prisma.verificationToken.deleteMany({
    where: { identifier: { in: createdEmails } },
  });
  await prisma.task.deleteMany({
    where: { workspaceId: { in: workspaceIds } },
  });
  await prisma.schedulingRun.deleteMany({
    where: { workspaceId: { in: workspaceIds } },
  });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.workspace.deleteMany({ where: { id: { in: workspaceIds } } });
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      )
    )
    .toBe(true);
}

test.describe("clean-database first run", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    await enablePublicFirstRun();
  });

  test.afterAll(async () => {
    try {
      await cleanupCreatedUsers();
    } finally {
      try {
        await restoreFirstRunSettings();
      } finally {
        await prisma.$disconnect();
      }
    }
  });

  for (const viewport of [360, 390]) {
    test(`${viewport}px: signup, verify, connect and schedule a first task`, async ({
      page,
    }) => {
      test.setTimeout(240_000);
      await page.setViewportSize({ width: viewport, height: 844 });
      await page.route("**/api/auth/register", async (route) => {
        await route.continue({
          headers: {
            ...route.request().headers(),
            "x-forwarded-for": `203.0.113.${((process.pid + viewport) % 250) + 1}`,
          },
        });
      });

      await page.goto("/auth/signin?error=OAuthAccountNotLinked");
      const authAlert = page.locator("p[role=alert]");
      await expect(authAlert).toContainText("method you used before");
      await expect(authAlert).not.toContainText("OAuthAccountNotLinked");

      const email = `onboarding-${viewport}-${runId}@example.com`;
      const password = "Needt-onboarding-Password1";
      createdEmails.push(email);

      await page.getByRole("tab", { name: "Create Account" }).click();
      await page.getByLabel("Name").fill(`Onboarding ${viewport}`);
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password", { exact: true }).fill(password);
      await page.getByLabel("Confirm password").fill(password);
      await page.getByRole("button", { name: "Create Account" }).click();
      await expect(page).toHaveURL(/\/calendar$/, { timeout: 30_000 });

      const user = await prisma.user.findUniqueOrThrow({
        where: { email },
        select: {
          id: true,
          emailVerified: true,
          autoScheduleSettings: { select: { userId: true } },
        },
      });
      expect(user.emailVerified).toBeNull();
      expect(user.autoScheduleSettings?.userId).toBe(user.id);

      await expect(page.getByTestId("calendar-empty-state")).toBeVisible({
        timeout: 30_000,
      });
      await expectNoHorizontalOverflow(page);

      await page.goto("/tasks");
      await expect(
        page.getByRole("heading", { name: "Space is best on desktop" })
      ).toBeVisible();
      await page.getByRole("button", { name: "Open Task List" }).click();
      await expect(page.getByText("No tasks yet.")).toBeVisible();
      await expectNoHorizontalOverflow(page);

      const emptyStates = [
        ["/today", "A clear day. Write anywhere or type /task."],
        ["/projects", "Create your first project"],
        ["/focus", "Your queue is clear."],
        ["/pages", "Quick start"],
        ["/moodboards", "Start a visual workspace"],
        ["/mail", "Mail is not configured"],
      ] as const;

      for (const [path, copy] of emptyStates) {
        await page.goto(path);
        await expect(
          page
            .getByText(copy, { exact: false })
            .filter({ visible: true })
            .first()
        ).toBeVisible({ timeout: 30_000 });
        await expectNoHorizontalOverflow(page);
      }

      const rawToken = `onboarding-token-${viewport}-${runId}`;
      const token = createHash("sha256").update(rawToken).digest("hex");
      await prisma.verificationToken.deleteMany({
        where: { identifier: email },
      });
      await prisma.verificationToken.create({
        data: {
          identifier: email,
          token,
          expires: addCalendarDays(newDate(), 1),
        },
      });
      await page.goto(
        `/auth/confirm-email?email=${encodeURIComponent(email)}&token=${encodeURIComponent(rawToken)}`
      );
      await page.getByRole("button", { name: "Confirm email" }).click();
      await page.waitForURL(/\/settings\?emailVerification=verified$/, {
        timeout: 30_000,
        waitUntil: "commit",
      });
      await expect
        .poll(async () =>
          prisma.trialGrant.count({ where: { userId: user.id } })
        )
        .toBe(1);

      let providerBoundaryCalled = false;
      await page.route("**/api/integration-status", async (route) => {
        await route.fulfill({
          json: {
            google: { configured: true },
            outlook: { configured: false },
          },
        });
      });
      await page.route("**/api/calendar/google/auth", async (route) => {
        providerBoundaryCalled = true;
        await route.fulfill({
          body: "Provider authorization boundary reached",
          contentType: "text/plain",
          status: 200,
        });
      });

      await page.goto("/settings#calendars");
      await page.getByRole("button", { name: "Add account" }).click();
      await page.getByRole("menuitem", { name: "Add Google Calendar" }).click();
      await expect.poll(() => providerBoundaryCalled).toBe(true);
      await page.goto(
        "/settings?provider=google&calendarSuccess=connected#calendars"
      );
      await expect(
        page
          .getByRole("status")
          .filter({ hasText: "Google Calendar connected" })
      ).toBeVisible();

      await page.goto(
        "/settings?provider=google&calendarError=consent_denied#calendars"
      );
      await expect(
        page
          .getByRole("alert")
          .filter({ hasText: "Google Calendar wasn’t connected" })
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Reconnect Google Calendar" })
      ).toBeVisible();

      const taskTitle = `First scheduled task ${viewport} ${runId}`;
      await page.goto("/calendar");
      await page
        .getByTestId("calendar-empty-state")
        .getByRole("button", { name: "Create task" })
        .click();
      const modal = page.getByTestId("task-modal");
      await modal.getByLabel("Task name").fill(taskTitle);
      const autoSchedule = modal.getByRole("switch", {
        name: /^Auto-scheduled/,
      });
      if ((await autoSchedule.getAttribute("aria-checked")) !== "true") {
        await autoSchedule.click();
      }
      const scheduling = page.waitForResponse(
        (response) =>
          response.url().endsWith("/api/tasks/schedule-all") &&
          response.request().method() === "POST"
      );
      await modal.getByRole("button", { name: "Save task" }).click();
      const schedulingResponse = await scheduling;
      expect(schedulingResponse.ok()).toBe(true);
      const schedulingRun = (await schedulingResponse.json()) as {
        runId?: string;
        status?: string;
      };
      if (schedulingRun.status === "QUEUED" && schedulingRun.runId) {
        await executeSchedulingRun(schedulingRun.runId);
      }
      let scheduledStart: Date | null = null;
      await expect
        .poll(
          async () => {
            const [task, run] = await Promise.all([
              prisma.task.findFirst({
                where: { userId: user.id, title: taskTitle },
                select: { scheduledEnd: true, scheduledStart: true },
              }),
              prisma.schedulingRun.findFirst({
                where: { userId: user.id },
                orderBy: { createdAt: "desc" },
                select: { errorCode: true, errorMessage: true, status: true },
              }),
            ]);
            scheduledStart = task?.scheduledStart ?? null;
            return {
              errorCode: run?.errorCode ?? null,
              errorMessage: run?.errorMessage ?? null,
              scheduled: Boolean(task?.scheduledStart && task.scheduledEnd),
              status: run?.status ?? null,
            };
          },
          { timeout: 60_000 }
        )
        .toMatchObject({ scheduled: true, status: "SUCCEEDED" });
      expect(scheduledStart).not.toBeNull();
      const daysUntilScheduled = calendarDayDifference(
        newDate(scheduledStart!),
        newDate()
      );
      for (let day = 0; day < daysUntilScheduled; day += 1) {
        await page.getByRole("button", { name: "Next period" }).click();
      }
      await expect(
        page.getByText(taskTitle).filter({ visible: true }).first()
      ).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  }
});
