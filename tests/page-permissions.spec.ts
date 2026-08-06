import { encode } from "next-auth/jwt";

import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";

if (!process.env.NEXTAUTH_SECRET && existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

const pageId = "page-permissions-e2e";
const pageDetail = {
  id: pageId,
  userId: "page-owner",
  workspaceId: "workspace-e2e",
  parentId: null,
  title: "Shared brief",
  icon: null,
  coverUrl: null,
  isPrivate: false,
  isFavorite: false,
  accessRole: "FULL_ACCESS",
  updatedAt: "2026-08-06T10:00:00.000Z",
  database: null,
  children: [],
  blocks: [
    {
      id: "permission-block",
      parentBlockId: null,
      type: "PARAGRAPH",
      content: {
        json: {
          type: "paragraph",
          attrs: { blockId: "permission-block" },
          content: [{ type: "text", text: "Permission boundary" }],
        },
      },
      position: 1024,
      createdBy: "HUMAN",
    },
  ],
};

test("Full Access manages direct Page roles and denied writes stay denied", async ({
  page,
}) => {
  const secret = process.env.NEXTAUTH_SECRET;
  expect(secret, "NEXTAUTH_SECRET is required").toBeTruthy();
  const token = await encode({
    secret: secret!,
    maxAge: 3600,
    token: { sub: "page-owner", email: "owner@needt.local" },
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

  const mutations: Array<{ method: string; body: Record<string, string> }> = [];
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === `/api/pages/${pageId}`) {
      await route.fulfill({ json: { page: pageDetail } });
      return;
    }
    if (url.pathname === `/api/pages/${pageId}/permissions`) {
      if (request.method() === "GET") {
        await route.fulfill({ json: { ownerId: "page-owner", grants: [] } });
        return;
      }
      const body = JSON.parse(request.postData() ?? "{}") as Record<
        string,
        string
      >;
      mutations.push({ method: request.method(), body });
      await route.fulfill({
        json: {
          success: true,
          grant: {
            userId: body.userId,
            role: body.role,
            user: { name: "Alice", email: "alice@needt.local", image: null },
          },
        },
      });
      return;
    }
    if (url.pathname === "/api/workspaces/workspace-e2e/members") {
      await route.fulfill({
        json: {
          members: [
            {
              userId: "page-owner",
              role: "OWNER",
              user: { name: "Owner", email: "owner@needt.local", image: null },
            },
            {
              userId: "alice",
              role: "EDITOR",
              user: { name: "Alice", email: "alice@needt.local", image: null },
            },
          ],
        },
      });
      return;
    }
    if (
      url.pathname === `/api/pages/${pageId}/blocks` &&
      request.headers()["x-page-bypass-attempt"] === "1"
    ) {
      await route.fulfill({
        status: 403,
        json: { error: "Page access denied" },
      });
      return;
    }
    await route.fulfill({ json: {} });
  });

  await page.goto(`/pages/${pageId}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Page options" }).click();
  await page.getByRole("button", { name: "Share & permissions" }).click();
  await page.getByRole("combobox", { name: "Access for Alice" }).click();
  await page.getByRole("option", { name: "Viewer" }).click();
  await expect
    .poll(() => mutations)
    .toContainEqual({
      method: "PUT",
      body: { userId: "alice", role: "VIEWER" },
    });

  const bypassStatus = await page.evaluate(async (id) => {
    const response = await fetch(`/api/pages/${id}/blocks`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-page-bypass-attempt": "1",
      },
      body: JSON.stringify({ blocks: [] }),
    });
    return response.status;
  }, pageId);
  expect(bypassStatus).toBe(403);
});
