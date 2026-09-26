import {
  collaborationDocumentToPageBlocks,
  pageBlocksToCollaborationState,
} from "@/services/pages/page-collaboration-document";
import {
  PageCollaborationActiveError,
  PageCollaborationLeaseExpiredError,
  PageRevisionConflictError,
  openPageCollaborationSession,
  storePageCollaborationDocument,
  touchPageCollaborationSession,
  writePageBlocks,
} from "@/services/pages/page-write-path";
import { PageAuthor, PageBlockType } from "@prisma/client";

import { Yjs as Y } from "@/lib/collaboration/yjs";

jest.mock("@/lib/auth/page-auth", () => ({
  pageVisibilityWhere: jest.fn(),
  resolvePageAccess: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    page: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  },
}));

const { prisma } =
  jest.requireMock<typeof import("@/lib/prisma")>("@/lib/prisma");
const pageFindFirst = prisma.page.findFirst as jest.Mock;
const transaction = prisma.$transaction as jest.Mock;

function transactionClient(liveSessions: number) {
  return {
    $queryRaw: jest.fn().mockResolvedValue([{ pg_advisory_xact_lock: null }]),
    page: {
      findFirst: jest.fn().mockResolvedValue({ id: "page-1" }),
      findUnique: jest.fn().mockResolvedValue({ id: "page-1" }),
      update: jest.fn(),
    },
    pageBlock: {
      count: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    pageRevision: { create: jest.fn() },
    workspaceMember: { findUnique: jest.fn() },
    pageCollaborationState: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
    },
    pageCollaborationSession: {
      count: jest.fn().mockResolvedValue(liveSessions),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      findUnique: jest
        .fn()
        .mockResolvedValue(liveSessions > 0 ? { pageId: "page-1" } : null),
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
  };
}

describe("page write path", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pageFindFirst.mockResolvedValue({ id: "page-1" });
  });

  it("rejects a snapshot write while collaboration owns the page", async () => {
    const tx = transactionClient(1);
    transaction.mockImplementation(async (callback) => callback(tx));

    await expect(
      writePageBlocks("user-1", "page-1", [
        {
          id: "block-1",
          type: PageBlockType.PARAGRAPH,
          content: { text: "stale REST value" },
          position: 1024,
          createdBy: PageAuthor.HUMAN,
        },
      ])
    ).rejects.toBeInstanceOf(PageCollaborationActiveError);

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.pageRevision.create).not.toHaveBeenCalled();
    expect(tx.pageBlock.updateMany).not.toHaveBeenCalled();
    expect(tx.pageCollaborationState.upsert).not.toHaveBeenCalled();
  });

  it("rechecks page access after acquiring the page lock", async () => {
    const tx = transactionClient(0);
    tx.page.findFirst.mockResolvedValue(null);
    transaction.mockImplementation(async (callback) => callback(tx));

    await expect(writePageBlocks("user-1", "page-1", [])).resolves.toBeNull();

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.pageCollaborationSession.count).not.toHaveBeenCalled();
    expect(tx.pageRevision.create).not.toHaveBeenCalled();
    expect(tx.pageBlock.updateMany).not.toHaveBeenCalled();
  });

  it("serializes session registration through the same page lock", async () => {
    const tx = transactionClient(0);
    tx.pageCollaborationSession.upsert.mockResolvedValue({});
    transaction.mockImplementation(async (callback) => callback(tx));

    await expect(
      openPageCollaborationSession("page-1", "socket-1")
    ).resolves.toBe(true);

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.pageCollaborationSession.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          pageId_sessionId: { pageId: "page-1", sessionId: "socket-1" },
        },
      })
    );
  });

  it("serializes session renewal through the same page lock", async () => {
    const tx = transactionClient(0);
    tx.pageCollaborationSession.updateMany.mockResolvedValue({ count: 1 });
    transaction.mockImplementation(async (callback) => callback(tx));

    await expect(
      touchPageCollaborationSession("page-1", "socket-1")
    ).resolves.toBe(true);

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.pageCollaborationSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { pageId: "page-1", sessionId: "socket-1" },
      })
    );
  });

  it("writes blocks and their generated collaboration state together", async () => {
    const tx = transactionClient(0);
    const staleState = pageBlocksToCollaborationState([
      {
        id: "stale-block",
        parentBlockId: null,
        type: PageBlockType.PARAGRAPH,
        content: { text: "stale offline value" },
        position: 1024,
        createdBy: PageAuthor.HUMAN,
      },
    ]);
    tx.pageCollaborationState.findUnique.mockResolvedValue({
      state: Buffer.from(staleState),
    });
    tx.page.findUnique.mockResolvedValue({
      id: "page-1",
      title: "Snapshot page",
      icon: null,
      contentRevision: 0,
      updatedAt: new Date("2026-09-26T08:00:00.000Z"),
      documentFormatVersion: 1,
      blocks: [],
    });
    tx.pageBlock.count.mockResolvedValue(0);
    tx.pageBlock.upsert.mockResolvedValue({});
    transaction.mockImplementation(async (callback) => callback(tx));
    const blocks = [
      {
        id: "block-1",
        type: PageBlockType.PARAGRAPH,
        content: { text: "REST value" },
        position: 1024,
        createdBy: PageAuthor.HUMAN,
      },
    ];

    await writePageBlocks("user-1", "page-1", blocks);

    expect(tx.pageBlock.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "block-1" } })
    );
    expect(tx.pageCollaborationState.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { pageId: "page-1" },
        create: expect.objectContaining({
          pageId: "page-1",
          state: expect.any(Buffer),
        }),
      })
    );
    expect(tx.page.update).toHaveBeenCalledWith({
      where: { id: "page-1" },
      data: {
        contentRevision: { increment: 1 },
        updatedAt: expect.any(Date),
      },
    });
    const savedState = tx.pageCollaborationState.upsert.mock.calls[0][0].create
      .state as Buffer;
    const document = new Y.Doc();
    Y.applyUpdate(document, staleState);
    Y.applyUpdate(document, savedState);
    const projectedBlocks = collaborationDocumentToPageBlocks(document);
    expect(projectedBlocks).toEqual([
      expect.objectContaining({
        id: "block-1",
        parentBlockId: null,
        type: PageBlockType.PARAGRAPH,
      }),
    ]);
    expect(JSON.stringify(projectedBlocks[0].content)).toContain("REST value");
    expect(projectedBlocks.map((block) => block.id)).not.toContain(
      "stale-block"
    );
  });

  it("rejects a stale snapshot after acquiring the page lock", async () => {
    const tx = transactionClient(0);
    tx.page.findUnique.mockResolvedValue({
      id: "page-1",
      title: "Changed page",
      icon: null,
      contentRevision: 2,
      updatedAt: new Date("2026-09-26T08:01:00.000Z"),
      documentFormatVersion: 1,
      blocks: [],
    });
    transaction.mockImplementation(async (callback) => callback(tx));

    await expect(
      writePageBlocks(
        "user-1",
        "page-1",
        [],
        PageAuthor.HUMAN,
        1,
        1
      )
    ).rejects.toBeInstanceOf(PageRevisionConflictError);

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.pageRevision.create).not.toHaveBeenCalled();
    expect(tx.pageBlock.updateMany).not.toHaveBeenCalled();
    expect(tx.pageCollaborationState.upsert).not.toHaveBeenCalled();
  });

  it("rejects a collaborative store after its lease expires", async () => {
    const tx = transactionClient(0);
    transaction.mockImplementation(async (callback) => callback(tx));

    await expect(
      storePageCollaborationDocument(
        "user-1",
        "page-1",
        "socket-1",
        new Y.Doc()
      )
    ).rejects.toBeInstanceOf(PageCollaborationLeaseExpiredError);

    expect(tx.pageRevision.create).not.toHaveBeenCalled();
    expect(tx.pageBlock.updateMany).not.toHaveBeenCalled();
    expect(tx.pageCollaborationState.upsert).not.toHaveBeenCalled();
  });

  it("rejects a stale collaboration generation while another session is live", async () => {
    const tx = transactionClient(1);
    tx.pageCollaborationSession.findUnique.mockResolvedValue(null);
    transaction.mockImplementation(async (callback) => callback(tx));

    await expect(
      storePageCollaborationDocument(
        "user-1",
        "page-1",
        "stale-socket",
        new Y.Doc()
      )
    ).rejects.toBeInstanceOf(PageCollaborationLeaseExpiredError);

    expect(tx.pageCollaborationSession.count).not.toHaveBeenCalled();
    expect(tx.pageBlock.updateMany).not.toHaveBeenCalled();
    expect(tx.pageCollaborationState.upsert).not.toHaveBeenCalled();
  });

  it("stores live state and its block projection in one transaction", async () => {
    const tx = transactionClient(1);
    tx.page.findUnique.mockResolvedValue({
      id: "page-1",
      title: "Live page",
      icon: null,
      updatedAt: new Date("2026-09-26T08:00:00.000Z"),
      documentFormatVersion: 1,
      blocks: [],
    });
    tx.pageBlock.count.mockResolvedValue(0);
    tx.pageBlock.upsert.mockResolvedValue({});
    tx.pageCollaborationState.upsert.mockResolvedValue({});
    transaction.mockImplementation(async (callback) => callback(tx));
    const document = new Y.Doc();
    Y.applyUpdate(
      document,
      pageBlocksToCollaborationState([
        {
          id: "block-1",
          parentBlockId: null,
          type: PageBlockType.PARAGRAPH,
          content: { text: "authoritative live value" },
          position: 1024,
          createdBy: PageAuthor.HUMAN,
        },
      ])
    );

    await storePageCollaborationDocument(
      "user-1",
      "page-1",
      "socket-1",
      document
    );

    expect(tx.pageCollaborationSession.findUnique).toHaveBeenCalledWith({
      where: {
        pageId_sessionId: { pageId: "page-1", sessionId: "socket-1" },
      },
      select: { pageId: true },
    });

    expect(tx.pageBlock.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "block-1" },
      })
    );
    expect(
      JSON.stringify(tx.pageBlock.upsert.mock.calls[0][0].update.content)
    ).toContain("authoritative live value");
    expect(tx.pageCollaborationState.upsert).toHaveBeenCalledWith({
      where: { pageId: "page-1" },
      create: {
        pageId: "page-1",
        state: Buffer.from(Y.encodeStateAsUpdate(document)),
      },
      update: { state: Buffer.from(Y.encodeStateAsUpdate(document)) },
    });
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
