import { encode } from "next-auth/jwt";

import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";

if (!process.env.NEXTAUTH_SECRET && existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

const project = {
  id: "project-e2e",
  name: "Website launch",
  description: "Ship the new public website",
  color: null,
  icon: null,
  progress: 50,
  completed: 1,
  total: 2,
  blockerCount: 1,
  status: "active",
  workspaceId: "workspace-e2e",
  startDate: "2026-08-03T00:00:00.000Z",
  deadline: "2026-08-14T00:00:00.000Z",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-05T00:00:00.000Z",
  _count: { tasks: 2 },
};

const stages = [
  {
    id: "stage-plan",
    projectId: project.id,
    name: "Planning",
    color: null,
    position: 0,
    startDate: "2026-08-03T00:00:00.000Z",
    deadline: "2026-08-07T00:00:00.000Z",
  },
  {
    id: "stage-launch",
    projectId: project.id,
    name: "Launch",
    color: null,
    position: 1,
    startDate: "2026-08-08T00:00:00.000Z",
    deadline: "2026-08-14T00:00:00.000Z",
  },
];

function task(
  id: string,
  title: string,
  status: "todo" | "completed",
  stageId: string
) {
  return {
    id,
    title,
    description: null,
    status,
    stageId,
    projectId: project.id,
    workspaceId: project.workspaceId,
    assigneeId: null,
    assignee: null,
    tags: [],
    blockedByDependencies: [],
    startDate: stages.find((stage) => stage.id === stageId)?.startDate,
    deadline: stages.find((stage) => stage.id === stageId)?.deadline,
    dueDate: null,
    duration: 60,
    hardDeadline: false,
    isRecurring: false,
    isAutoScheduled: false,
    scheduleLocked: false,
    isArchived: false,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-05T00:00:00.000Z",
  };
}

test("Projects switch between List, Kanban, Gantt, and templates", async ({
  page,
}) => {
  const secret = process.env.NEXTAUTH_SECRET;
  expect(secret, "NEXTAUTH_SECRET is required for projects E2E").toBeTruthy();
  const token = await encode({
    secret: secret!,
    maxAge: 60 * 60,
    token: {
      sub: "project-e2e-user",
      email: "project-e2e@needt.local",
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

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/projects") {
      await route.fulfill({ json: [{ ...project, stages }] });
      return;
    }
    if (url.pathname === `/api/projects/${project.id}`) {
      await route.fulfill({
        json: {
          ...project,
          stages,
          tasks: [
            task(
              "task-plan",
              "Approve launch brief",
              "completed",
              "stage-plan"
            ),
            task("task-site", "Publish website", "todo", "stage-launch"),
          ],
          blockers: [
            {
              id: "blocker-client",
              projectId: project.id,
              stageId: "stage-launch",
              title: "Waiting for client approval",
              resolvedAt: null,
              blockerTask: null,
            },
          ],
        },
      });
      return;
    }
    if (url.pathname === "/api/project-templates") {
      await route.fulfill({ json: { templates: [] } });
      return;
    }
    await route.fulfill({ json: [] });
  });

  await page.goto("/projects");
  await expect(page.getByText("Website launch").first()).toBeVisible();
  await expect(
    page.getByRole("progressbar", { name: "Project progress" })
  ).toHaveAttribute("aria-valuenow", "50");
  await expect(page.getByText("Approve launch brief")).toBeVisible();

  await page.getByRole("tab", { name: "Kanban" }).click();
  await expect(page.getByRole("heading", { name: "Planning" })).toBeVisible();
  await expect(page.getByText("Publish website")).toBeVisible();

  await page.getByRole("tab", { name: "Gantt" }).click();
  await expect(page.getByText("Project timeline")).toBeVisible();
  await expect(page.getByText("Unscheduled")).toHaveCount(0);

  await page.getByRole("button", { name: "Templates" }).click();
  await expect(
    page.getByRole("heading", { name: "Project templates" })
  ).toBeVisible();
  await expect(
    page.getByText("Optional placeholder role per task")
  ).toBeVisible();
});
