import { createCollaborationServer } from "@/collaboration/server";
import { issuePageCollaborationToken } from "@/services/pages/page-collaboration-token";
import {
  HocuspocusProvider,
  HocuspocusProviderWebsocket,
} from "@hocuspocus/provider";
import { expect, test } from "@playwright/test";
import { WorkspaceKind, WorkspaceRole } from "@prisma/client";
import { randomUUID } from "node:crypto";

import { Yjs as Y } from "@/lib/collaboration/yjs";
import { prisma } from "@/lib/prisma";

const runId = randomUUID();
const clients: CollaborationClient[] = [];
const previousCollaborationSecret = process.env.COLLABORATION_SECRET;

type CollaborationClient = {
  document: Y.Doc;
  provider: HocuspocusProvider;
  socket: HocuspocusProviderWebsocket;
  closeReason: string | null;
  authenticationFailure: string | null;
};

let server: ReturnType<typeof createCollaborationServer>;
let workspaceId = "";
let pageId = "";
let ownerId = "";
let memberId = "";
let ownerToken = "";
let memberToken = "";
let collaborationUrl = "";

function createClient(token: string, documentName: string) {
  const document = new Y.Doc({ guid: documentName });
  const socket = new HocuspocusProviderWebsocket({
    url: collaborationUrl,
    autoConnect: false,
    maxAttempts: 1,
    initialDelay: 0,
  });
  const state: CollaborationClient = {
    document,
    socket,
    closeReason: null,
    authenticationFailure: null,
    provider: undefined as unknown as HocuspocusProvider,
  };
  state.provider = new HocuspocusProvider({
    name: documentName,
    document,
    websocketProvider: socket,
    token,
    onClose: ({ event }) => {
      state.closeReason = event.reason;
    },
    onAuthenticationFailed: ({ reason }) => {
      state.authenticationFailure = reason;
    },
  });
  state.provider.attach();
  clients.push(state);
  return state;
}

async function connectClient(token: string, documentName: string) {
  const client = createClient(token, documentName);
  await client.socket.connect();
  await expect
    .poll(() => client.provider.isSynced, { timeout: 5_000 })
    .toBe(true);
  return client;
}

function destroyClient(client: CollaborationClient) {
  client.provider.destroy();
  client.socket.destroy();
  client.document.destroy();
  const index = clients.indexOf(client);
  if (index >= 0) clients.splice(index, 1);
}

test.describe("collaboration authorization boundary", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    process.env.COLLABORATION_SECRET = `s4-collaboration-${runId}`;
    const [owner, member] = await Promise.all([
      prisma.user.findUnique({
        where: { email: "ci-pro@needt.local" },
        select: { id: true },
      }),
      prisma.user.findUnique({
        where: { email: "ci-lifetime@needt.local" },
        select: { id: true },
      }),
    ]);
    expect(owner, "ci-pro@needt.local must be seeded").not.toBeNull();
    expect(member, "ci-lifetime@needt.local must be seeded").not.toBeNull();
    ownerId = owner!.id;
    memberId = member!.id;

    await Promise.all(
      [ownerId, memberId].map((userId) =>
        prisma.featureFlagOverride.upsert({
          where: { flagKey_userId: { flagKey: "workspaces", userId } },
          update: { enabled: true },
          create: { flagKey: "workspaces", userId, enabled: true },
        })
      )
    );
    const workspace = await prisma.workspace.create({
      data: {
        name: `S4 collaboration ${runId}`,
        kind: WorkspaceKind.SHARED,
        members: {
          create: [
            { userId: ownerId, role: WorkspaceRole.OWNER },
            { userId: memberId, role: WorkspaceRole.EDITOR },
          ],
        },
        pages: {
          create: {
            title: `S4 collaboration ${runId}`,
            userId: ownerId,
            isPrivate: false,
          },
        },
      },
      select: { id: true, pages: { select: { id: true } } },
    });
    workspaceId = workspace.id;
    pageId = workspace.pages[0].id;

    const ownerAccess = {
      enabled: true,
      workspaceId,
      workspaceKind: WorkspaceKind.SHARED,
      role: WorkspaceRole.OWNER,
      dataScope: { mode: "workspace" as const, workspaceId },
    };
    const memberAccess = {
      ...ownerAccess,
      role: WorkspaceRole.EDITOR,
    };
    const issuedOwner = await issuePageCollaborationToken(
      { userId: ownerId, workspace: ownerAccess },
      pageId
    );
    const issuedMember = await issuePageCollaborationToken(
      { userId: memberId, workspace: memberAccess },
      pageId
    );
    expect(issuedOwner).not.toBeNull();
    expect(issuedMember).not.toBeNull();
    ownerToken = issuedOwner!.token;
    memberToken = issuedMember!.token;

    server = createCollaborationServer({
      address: "127.0.0.1",
      port: 0,
      useRedis: false,
      authorizationRecheckIntervalMs: 50,
    });
    await server.listen();
    collaborationUrl = server.webSocketURL;
  });

  test.afterAll(async () => {
    for (const client of [...clients]) destroyClient(client);
    await server?.destroy();
    if (pageId) {
      await prisma.page.delete({ where: { id: pageId } });
    }
    if (workspaceId) {
      await prisma.workspace.delete({ where: { id: workspaceId } });
    }
    await prisma.$disconnect();
    if (previousCollaborationSecret === undefined) {
      delete process.env.COLLABORATION_SECRET;
    } else {
      process.env.COLLABORATION_SECRET = previousCollaborationSecret;
    }
  });

  test("reconnects safely and revokes writes after role or membership changes", async () => {
    const firstConnection = await connectClient(memberToken, `page:${pageId}`);
    destroyClient(firstConnection);

    const member = await connectClient(memberToken, `page:${pageId}`);
    const owner = await connectClient(ownerToken, `page:${pageId}`);
    member.document.getText("probe").insert(0, "allowed");
    await expect
      .poll(() => owner.document.getText("probe").toString())
      .toBe("allowed");

    await prisma.workspaceMember.update({
      where: {
        workspaceId_userId: { workspaceId, userId: memberId },
      },
      data: { role: WorkspaceRole.VIEWER },
    });
    member.document.getText("probe").insert(7, "-blocked");
    await expect.poll(() => member.provider.hasUnsyncedChanges).toBe(true);
    expect(owner.document.getText("probe").toString()).toBe("allowed");

    await prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: { workspaceId, userId: memberId },
      },
    });
    await expect
      .poll(() => member.closeReason, { timeout: 5_000 })
      .toBe("Collaboration access revoked");

    const deniedReconnect = createClient(memberToken, `page:${pageId}`);
    await deniedReconnect.socket.connect();
    await expect
      .poll(() => deniedReconnect.authenticationFailure, { timeout: 5_000 })
      .toBeTruthy();
  });

  test("rejects a valid token when it is presented to another room", async () => {
    const forgedRoom = createClient(ownerToken, `page:guessed-${runId}`);
    await forgedRoom.socket.connect();
    await expect
      .poll(() => forgedRoom.authenticationFailure, { timeout: 5_000 })
      .toBeTruthy();
  });
});
