import { createCollaborationServer } from "@/collaboration/server";

import { Yjs as Y } from "@/lib/collaboration/yjs";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    page: { findUnique: jest.fn() },
    pageCollaborationState: { findUnique: jest.fn() },
  },
}));
jest.mock("@/services/pages/page-write-path", () => ({
  closePageCollaborationSessions: jest.fn(),
  openPageCollaborationSession: jest.fn(),
  storePageCollaborationDocument: jest.fn(),
  touchPageCollaborationSession: jest.fn(),
}));

const { prisma } =
  jest.requireMock<typeof import("@/lib/prisma")>("@/lib/prisma");
const {
  closePageCollaborationSessions,
  openPageCollaborationSession,
  storePageCollaborationDocument,
  touchPageCollaborationSession,
} = jest.requireMock<typeof import("@/services/pages/page-write-path")>(
  "@/services/pages/page-write-path"
);
const findState = prisma.pageCollaborationState.findUnique as jest.Mock;
const findPage = prisma.page.findUnique as jest.Mock;
const openSession = openPageCollaborationSession as jest.Mock;
const closeSessions = closePageCollaborationSessions as jest.Mock;
const storeDocument = storePageCollaborationDocument as jest.Mock;
const touchSession = touchPageCollaborationSession as jest.Mock;

function pageHookPayload(document: Y.Doc) {
  return {
    document,
    documentName: "page:v2:page-1",
  } as never;
}

describe("collaboration page-write lifecycle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    openSession.mockResolvedValue(true);
    closeSessions.mockResolvedValue(undefined);
    storeDocument.mockResolvedValue({ id: "page-1" });
    touchSession.mockResolvedValue(true);
  });

  it("releases a lease when loading the collaboration state fails", async () => {
    findState.mockResolvedValue(null);
    const server = createCollaborationServer({
      useRedis: false,
      authorizationRecheckIntervalMs: 0,
      buildSha: "test",
    });
    const document = new Y.Doc();

    await expect(
      server.configuration.onLoadDocument?.(pageHookPayload(document))
    ).rejects.toThrow("Page collaboration state is unavailable");

    expect(openSession).toHaveBeenCalledWith("page-1", expect.any(String));
    expect(closeSessions).toHaveBeenCalledWith("page-1", [expect.any(String)]);
    document.destroy();
  });

  it("does not release a replacement generation during old-document unload", async () => {
    const seed = new Y.Doc();
    findState.mockResolvedValue({
      state: Buffer.from(Y.encodeStateAsUpdate(seed)),
    });
    const server = createCollaborationServer({
      useRedis: false,
      authorizationRecheckIntervalMs: 0,
      buildSha: "test",
    });
    const first = new Y.Doc();
    const replacement = new Y.Doc();

    await server.configuration.onLoadDocument?.(pageHookPayload(first));
    const firstSessionId = openSession.mock.calls[0][1] as string;
    await server.configuration.beforeUnloadDocument?.({
      document: first,
      documentName: "page:v2:page-1",
      instance: { documents: new Map([["page:v2:page-1", first]]) },
    } as never);
    await server.configuration.onLoadDocument?.(pageHookPayload(replacement));
    const replacementSessionId = openSession.mock.calls[1][1] as string;
    await server.configuration.afterUnloadDocument?.({
      documentName: "page:v2:page-1",
    } as never);

    expect(closeSessions).toHaveBeenCalledWith("page-1", [firstSessionId]);
    expect(closeSessions).not.toHaveBeenCalledWith("page-1", [
      replacementSessionId,
    ]);

    await server.configuration.onDestroy?.({} as never);
    expect(closeSessions).toHaveBeenCalledWith("page-1", [
      replacementSessionId,
    ]);
    seed.destroy();
    first.destroy();
    replacement.destroy();
  });

  it("refuses an old unload that would delete a replacement document", async () => {
    const server = createCollaborationServer({
      useRedis: false,
      authorizationRecheckIntervalMs: 0,
      buildSha: "test",
    });
    const oldDocument = new Y.Doc();
    const replacement = new Y.Doc();

    await expect(
      server.configuration.beforeUnloadDocument?.({
        documentName: "page:v2:page-1",
        document: oldDocument,
        instance: {
          documents: new Map([["page:v2:page-1", replacement]]),
        },
      } as never)
    ).rejects.toThrow("Ignoring stale collaboration document unload");

    await server.configuration.onDestroy?.({} as never);
    oldDocument.destroy();
    replacement.destroy();
  });

  it("keeps the document lease alive when a store fails", async () => {
    jest.useFakeTimers();
    const seed = new Y.Doc();
    findState.mockResolvedValue({
      state: Buffer.from(Y.encodeStateAsUpdate(seed)),
    });
    findPage.mockResolvedValue({
      userId: "user-1",
      documentFormatVersion: 1,
    });
    storeDocument.mockResolvedValue(null);
    const server = createCollaborationServer({
      useRedis: false,
      authorizationRecheckIntervalMs: 0,
      buildSha: "test",
    });
    const document = new Y.Doc();
    await server.configuration.onLoadDocument?.(pageHookPayload(document));
    const sessionId = openSession.mock.calls[0][1] as string;

    await expect(
      server.configuration.onStoreDocument?.({
        document,
        documentName: "page:v2:page-1",
        lastContext: { resource: "page", actor: "user-1" },
      } as never)
    ).rejects.toThrow("Page collaboration write access was revoked");

    await jest.advanceTimersByTimeAsync(15_000);
    expect(touchSession).toHaveBeenCalledWith("page-1", sessionId);

    await server.configuration.onDestroy?.({} as never);
    seed.destroy();
    document.destroy();
    jest.useRealTimers();
  });

  it("resets the live document when its exact lease is lost", async () => {
    jest.useFakeTimers();
    const seed = new Y.Doc();
    findState.mockResolvedValue({
      state: Buffer.from(Y.encodeStateAsUpdate(seed)),
    });
    touchSession.mockResolvedValue(false);
    const server = createCollaborationServer({
      useRedis: false,
      authorizationRecheckIntervalMs: 0,
      buildSha: "test",
    });
    const closeConnections = jest.spyOn(server.hocuspocus, "closeConnections");
    const document = new Y.Doc();
    await server.configuration.onLoadDocument?.(pageHookPayload(document));

    await jest.advanceTimersByTimeAsync(15_000);

    expect(closeConnections).toHaveBeenCalledWith("page:v2:page-1");
    await server.configuration.onDestroy?.({} as never);
    seed.destroy();
    document.destroy();
    jest.useRealTimers();
  });
});
