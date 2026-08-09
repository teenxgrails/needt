import { encode } from "next-auth/jwt";

import { expect, request as playwrightRequest, test } from "@playwright/test";
import { WorkspaceKind, WorkspaceRole } from "@prisma/client";
import { existsSync } from "node:fs";

import { prisma } from "@/lib/prisma";

if (!process.env.NEXTAUTH_SECRET && existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const taskPrefix = `S1 isolation ${runId}`;
let ownerId = "";
let viewerId = "";
let workspaceA = "";
let workspaceB = "";

async function authenticatedRequest(userId: string) {
  const secret = process.env.NEXTAUTH_SECRET;
  expect(secret, "NEXTAUTH_SECRET is required for workspace e2e").toBeTruthy();
  const sessionToken = await encode({
    secret: secret!,
    token: { sub: userId },
  });
  return playwrightRequest.newContext({
    baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:3000",
    extraHTTPHeaders: {
      cookie: `next-auth.session-token=${sessionToken}`,
    },
  });
}

test.describe("workspace security boundary", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    const [owner, viewer] = await Promise.all([
      prisma.user.findUnique({
        where: { email: "ci-pro@needt.local" },
        select: { id: true },
      }),
      prisma.user.findUnique({
        where: { email: "ci-lifetime@needt.local" },
        select: { id: true },
      }),
    ]);
    expect(owner).not.toBeNull();
    expect(viewer).not.toBeNull();
    ownerId = owner!.id;
    viewerId = viewer!.id;

    await Promise.all(
      [ownerId, viewerId].map((userId) =>
        prisma.featureFlagOverride.upsert({
          where: { flagKey_userId: { flagKey: "workspaces", userId } },
          update: { enabled: true },
          create: { flagKey: "workspaces", userId, enabled: true },
        })
      )
    );

    const [first, second] = await Promise.all([
      prisma.workspace.create({
        data: {
          name: `S1 A ${runId}`,
          kind: WorkspaceKind.SHARED,
          members: {
            create: [
              { userId: ownerId, role: WorkspaceRole.OWNER },
              { userId: viewerId, role: WorkspaceRole.VIEWER },
            ],
          },
        },
        select: { id: true },
      }),
      prisma.workspace.create({
        data: {
          name: `S1 B ${runId}`,
          kind: WorkspaceKind.SHARED,
          members: {
            create: { userId: ownerId, role: WorkspaceRole.OWNER },
          },
        },
        select: { id: true },
      }),
    ]);
    workspaceA = first.id;
    workspaceB = second.id;

    await prisma.task.createMany({
      data: [
        {
          title: `${taskPrefix} workspace A`,
          status: "todo",
          userId: ownerId,
          assigneeId: ownerId,
          workspaceId: workspaceA,
        },
        {
          title: `${taskPrefix} workspace B`,
          status: "todo",
          userId: ownerId,
          assigneeId: ownerId,
          workspaceId: workspaceB,
        },
      ],
    });
  });

  test.afterAll(async () => {
    await prisma.task.deleteMany({
      where: { title: { startsWith: taskPrefix } },
    });
    await prisma.workspace.deleteMany({
      where: { id: { in: [workspaceA, workspaceB].filter(Boolean) } },
    });
    await prisma.$disconnect();
  });

  test("rejects a valid JWT for a deleted or unknown user", async () => {
    const orphan = await authenticatedRequest(`missing-${runId}`);
    const response = await orphan.get("/api/tasks");

    expect(response.status()).toBe(401);
    await orphan.dispose();
  });

  test("rejects forged workspace IDs and Viewer mutations", async () => {
    const owner = await authenticatedRequest(ownerId);
    const viewer = await authenticatedRequest(viewerId);

    const forged = await owner.get("/api/tasks", {
      headers: { "x-workspace-id": `forged-${runId}` },
    });
    expect(forged.status()).toBe(403);

    const write = await viewer.post("/api/tasks", {
      headers: { "x-workspace-id": workspaceA },
      data: { title: `${taskPrefix} viewer write`, status: "todo" },
    });
    expect(write.status()).toBe(403);

    await owner.dispose();
    await viewer.dispose();
  });

  test("does not aggregate search across the user's workspaces", async () => {
    const owner = await authenticatedRequest(ownerId);
    const response = await owner.get(
      `/api/search?q=${encodeURIComponent(taskPrefix)}`,
      { headers: { "x-workspace-id": workspaceA } }
    );

    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      results: Array<{ title: string }>;
    };
    expect(body.results.map((result) => result.title)).toContain(
      `${taskPrefix} workspace A`
    );
    expect(body.results.map((result) => result.title)).not.toContain(
      `${taskPrefix} workspace B`
    );
    await owner.dispose();
  });
});
