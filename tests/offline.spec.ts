import { encode } from "next-auth/jwt";

import { expect, test } from "@playwright/test";

import { prisma } from "@/lib/prisma";

test("offline data is scoped and purged across account changes", async ({
  context,
  page,
}) => {
  test.skip(
    process.env.NEXT_PUBLIC_PWA_IN_DEV !== "1",
    "Service-worker test mode is disabled"
  );
  const secret = process.env.NEXTAUTH_SECRET;
  expect(secret).toBeTruthy();
  const membership = await prisma.workspaceMember.findFirst({
    where: { user: { email: "ci-pro@needt.local" } },
    select: { userId: true, workspaceId: true },
  });
  expect(membership).not.toBeNull();
  const token = await encode({
    secret: secret!,
    token: { sub: membership!.userId },
  });
  await context.addCookies([
    {
      name: "next-auth.session-token",
      value: token,
      url: process.env.TEST_BASE_URL || "http://127.0.0.1:3000",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/tasks");
  await page.evaluate(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map((registration) => registration.unregister())
    );
    await navigator.serviceWorker.register("/sw.js", {
      updateViaCache: "none",
    });
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(
    () => Boolean(navigator.serviceWorker?.controller),
    undefined,
    { timeout: 15_000 }
  );
  await page.evaluate(({ userId, workspaceId }) => {
    return new Promise<void>((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => resolve();
      navigator.serviceWorker.controller?.postMessage(
        {
          type: "NEEDT_SET_OFFLINE_SCOPE",
          scope: { userId, workspaceId, schemaVersion: 2 },
        },
        [channel.port2]
      );
    });
  }, membership!);

  await context.setOffline(true);
  const queued = await page.evaluate(async () => {
    try {
      const response = await fetch("/api/tasks/offline-contract", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Saved offline", revision: 7 }),
      });
      return { status: response.status, body: await response.json() };
    } catch (error) {
      return {
        status: -1,
        body: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  });

  const pending = await page.evaluate(async () => {
    const request = indexedDB.open("needt-offline-v2", 2);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = db.transaction("mutationQueue", "readonly");
    const getAll = transaction.objectStore("mutationQueue").getAll();
    return new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
      getAll.onsuccess = () => resolve(getAll.result);
      getAll.onerror = () => reject(getAll.error);
    });
  });
  expect({ queued, pendingCount: pending.length }).toEqual({
    queued: {
      status: 202,
      body: expect.objectContaining({ queued: true, code: "SAVED_LOCALLY" }),
    },
    pendingCount: 1,
  });
  expect(pending[0]).toEqual(
    expect.objectContaining({
      userId: membership!.userId,
      workspaceId: membership!.workspaceId,
      baseRevision: 7,
      status: "pending",
    })
  );

  await context.setOffline(false);
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => resolve();
      navigator.serviceWorker.controller?.postMessage(
        {
          type: "NEEDT_SET_OFFLINE_SCOPE",
          scope: {
            userId: "another-user",
            workspaceId: "another-workspace",
            schemaVersion: 2,
          },
        },
        [channel.port2]
      );
    });
  });
  await expect
    .poll(async () =>
      page.evaluate(async () => {
        const request = indexedDB.open("needt-offline-v2", 2);
        const db = await new Promise<IDBDatabase>((resolve) => {
          request.onsuccess = () => resolve(request.result);
        });
        const transaction = db.transaction("mutationQueue", "readonly");
        const count = transaction.objectStore("mutationQueue").count();
        return new Promise<number>((resolve) => {
          count.onsuccess = () => resolve(count.result);
        });
      })
    )
    .toBe(0);

  await prisma.$disconnect();
});
