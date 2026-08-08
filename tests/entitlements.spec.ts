import { encode } from "next-auth/jwt";
import { existsSync } from "node:fs";

import { expect, request as playwrightRequest, test } from "@playwright/test";

import { prisma } from "@/lib/prisma";

if (!process.env.NEXTAUTH_SECRET && existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

async function authenticatedRequest(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true },
  });
  expect(user, `missing seeded user ${email}`).not.toBeNull();
  const secret = process.env.NEXTAUTH_SECRET;
  expect(secret, "NEXTAUTH_SECRET is required for entitlement e2e").toBeTruthy();
  const sessionToken = await encode({
    secret: secret!,
    token: { sub: user!.id, email: user!.email, role: user!.role },
  });
  return playwrightRequest.newContext({
    baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:3000",
    extraHTTPHeaders: {
      cookie: `next-auth.session-token=${sessionToken}`,
    },
  });
}

async function createTask(
  context: Awaited<ReturnType<typeof authenticatedRequest>>,
  title: string
) {
  const response = await context.post("/api/tasks", {
    data: {
      title,
      status: "todo",
      isAutoScheduled: false,
      scheduleLocked: false,
      deadline: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { id: string };
}

test.describe("plan entitlements and tenant isolation", () => {
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("FREE cannot reach paid focus, reminder, or booking behavior through APIs", async () => {
    const free = await authenticatedRequest("ci-free@needt.local");
    const paidFocus = await free.post("/api/focus/session", {
      data: {
        action: "start",
        mode: "POMODORO",
        plannedMinutes: 25,
        strictness: "TIMEOUT",
      },
    });
    expect(paidFocus.status()).toBe(403);

    const task = await createTask(free, `FREE gated ${Date.now()}`);
    const secondReminder = await free.post(`/api/tasks/${task.id}/reminders`, {
      data: {
        kind: "BEFORE_START",
        offsetMinutes: 10,
        channels: ["email"],
      },
    });
    expect(secondReminder.status()).toBe(403);

    const slug = `ci-free-${Date.now()}`;
    const existingPages = (await (
      await free.get("/api/booking-pages")
    ).json()) as { pages: unknown[] };
    if (existingPages.pages.length === 0) {
      const firstPage = await free.post("/api/booking-pages", {
        data: { title: "Free page", slug },
      });
      expect(firstPage.status()).toBe(201);
    }
    const secondPage = await free.post("/api/booking-pages", {
      data: { title: "Second free page", slug: `${slug}-second` },
    });
    expect(secondPage.status()).toBe(403);
    await free.dispose();
  });

  test("PRO can use paid Focus and remains isolated from another user's tasks", async () => {
    const free = await authenticatedRequest("ci-free@needt.local");
    const pro = await authenticatedRequest("ci-pro@needt.local");
    const foreignTask = await createTask(free, `Foreign ${Date.now()}`);
    const ownTask = await createTask(pro, `Own ${Date.now()}`);

    const crossUserDependency = await pro.post(
      `/api/tasks/${ownTask.id}/dependencies`,
      { data: { blockerTaskId: foreignTask.id } }
    );
    expect(crossUserDependency.status()).toBe(404);

    const active = (await (
      await pro.get("/api/focus/session")
    ).json()) as { session?: { id: string } | null };
    if (active.session) {
      await pro.post("/api/focus/session", {
        data: {
          action: "stop",
          sessionId: active.session.id,
          completed: true,
        },
      });
    }
    const focus = await pro.post("/api/focus/session", {
      data: {
        action: "start",
        mode: "POMODORO",
        plannedMinutes: 25,
        strictness: "TIMEOUT",
      },
    });
    expect(focus.status()).toBe(200);
    const focusBody = (await focus.json()) as { session: { id: string } };
    const stop = await pro.post("/api/focus/session", {
      data: {
        action: "stop",
        sessionId: focusBody.session.id,
        completed: true,
      },
    });
    expect(stop.ok()).toBeTruthy();
    await Promise.all([free.dispose(), pro.dispose()]);
  });
});
