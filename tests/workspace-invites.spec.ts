import { expect, request as playwrightRequest, test } from "@playwright/test";
import { encode } from "next-auth/jwt";

import { newDate } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";

async function authenticatedRequest(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true },
  });
  expect(user, `missing seeded user ${email}`).not.toBeNull();
  const secret = process.env.NEXTAUTH_SECRET;
  expect(secret, "NEXTAUTH_SECRET is required for workspace e2e").toBeTruthy();
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

test.describe("workspace invites", () => {
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("enforces paid plans, single use, roles, and the last owner", async () => {
    test.setTimeout(90_000);
    const free = await authenticatedRequest("ci-free@needt.local");
    const pro = await authenticatedRequest("ci-pro@needt.local");
    const lifetime = await authenticatedRequest("ci-lifetime@needt.local");

    const freeCreate = await free.post("/api/workspaces", {
      data: { name: `FREE workspace ${Date.now()}` },
    });
    expect(freeCreate.status()).toBe(403);
    expect(await freeCreate.json()).toMatchObject({
      error: "SHARED_WORKSPACE_REQUIRES_PAID",
    });

    const created = await pro.post("/api/workspaces", {
      data: { name: `Invite test ${Date.now()}` },
    });
    expect(created.status()).toBe(201);
    const { workspace } = (await created.json()) as {
      workspace: { id: string };
    };

    const freeInvite = await pro.post(
      `/api/workspaces/${workspace.id}/invites`,
      {
        data: { email: "ci-free@needt.local", role: "VIEWER" },
      }
    );
    expect(freeInvite.status()).toBe(403);
    expect(await freeInvite.json()).toMatchObject({
      error: "INVITEE_REQUIRES_PAID",
    });

    const expiringInviteResponse = await pro.post(
      `/api/workspaces/${workspace.id}/invites`,
      {
        data: { email: "ci-lifetime@needt.local", role: "EDITOR" },
      }
    );
    expect(expiringInviteResponse.status()).toBe(201);
    const { invite: expiringInvite } =
      (await expiringInviteResponse.json()) as {
        invite: { id: string; token: string };
      };
    await prisma.workspaceInvite.update({
      where: { id: expiringInvite.id },
      data: { expiresAt: newDate(0) },
    });
    const expired = await lifetime.post("/api/workspace-invites/accept", {
      data: { token: expiringInvite.token },
    });
    expect(expired.status()).toBe(409);
    expect(await expired.json()).toMatchObject({ error: "INVITE_EXPIRED" });

    const inviteResponse = await pro.post(
      `/api/workspaces/${workspace.id}/invites`,
      {
        data: { email: "ci-lifetime@needt.local", role: "EDITOR" },
      }
    );
    expect(inviteResponse.status()).toBe(201);
    const { invite } = (await inviteResponse.json()) as {
      invite: { token: string };
    };

    const accepted = await lifetime.post("/api/workspace-invites/accept", {
      data: { token: invite.token },
    });
    expect(accepted.status()).toBe(200);
    expect(await accepted.json()).toMatchObject({
      membership: { workspaceId: workspace.id, role: "EDITOR" },
    });

    const replay = await lifetime.post("/api/workspace-invites/accept", {
      data: { token: invite.token },
    });
    expect(replay.status()).toBe(409);
    expect(await replay.json()).toMatchObject({
      error: "INVITE_ALREADY_USED",
    });

    const membersResponse = await pro.get(
      `/api/workspaces/${workspace.id}/members`
    );
    const { members } = (await membersResponse.json()) as {
      members: Array<{ userId: string; role: string; user: { email: string } }>;
    };
    const owner = members.find((member) => member.role === "OWNER");
    const editor = members.find((member) => member.role === "EDITOR");
    expect(owner).toBeDefined();
    expect(editor).toBeDefined();

    const makeViewer = await pro.patch(
      `/api/workspaces/${workspace.id}/members/${editor!.userId}`,
      { data: { role: "VIEWER" } }
    );
    expect(makeViewer.status()).toBe(200);
    expect(await makeViewer.json()).toMatchObject({
      member: { role: "VIEWER" },
    });
    const viewerInvites = await lifetime.get(
      `/api/workspaces/${workspace.id}/invites`
    );
    expect(viewerInvites.status()).toBe(403);

    const removeLastOwner = await pro.delete(
      `/api/workspaces/${workspace.id}/members/${owner!.userId}`
    );
    expect(removeLastOwner.status()).toBe(409);
    expect(await removeLastOwner.json()).toMatchObject({ error: "LAST_OWNER" });

    await Promise.all([free.dispose(), pro.dispose(), lifetime.dispose()]);
  });
});
