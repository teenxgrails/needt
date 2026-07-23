import {
  AiProposalStatus,
  DatabasePropertyType,
  DatabaseViewType,
  PageAuthor,
  PageBlockType,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export interface PageBlockInput {
  id?: string;
  parentBlockId?: string | null;
  type: PageBlockType;
  content: Prisma.InputJsonValue;
  position: number;
  createdBy?: PageAuthor;
}

const pageDetailInclude = {
  blocks: { orderBy: { position: "asc" as const } },
  children: {
    where: { trashedAt: null },
    orderBy: { position: "asc" as const },
  },
  database: {
    include: {
      properties: { orderBy: { position: "asc" as const } },
      views: { orderBy: { position: "asc" as const } },
      records: {
        orderBy: { position: "asc" as const },
        include: {
          page: true,
          values: true,
        },
      },
    },
  },
} satisfies Prisma.PageInclude;

export async function listPages(userId: string, options?: { search?: string }) {
  return prisma.page.findMany({
    where: {
      userId,
      trashedAt: null,
      ...(options?.search?.trim()
        ? {
            title: {
              contains: options.search.trim(),
              mode: "insensitive" as const,
            },
          }
        : {}),
    },
    select: {
      id: true,
      parentId: true,
      title: true,
      icon: true,
      isPrivate: true,
      isFavorite: true,
      createdBy: true,
      position: true,
      updatedAt: true,
      database: { select: { id: true } },
    },
    orderBy: [{ isFavorite: "desc" }, { position: "asc" }, { updatedAt: "desc" }],
  });
}

export async function getPage(userId: string, pageId: string) {
  return prisma.page.findFirst({
    where: { id: pageId, userId, trashedAt: null },
    include: pageDetailInclude,
  });
}

async function assertOwnedParent(userId: string, parentId?: string | null) {
  if (!parentId) return;
  const parent = await prisma.page.findFirst({
    where: { id: parentId, userId, trashedAt: null },
    select: { id: true },
  });
  if (!parent) throw new Error("Parent page not found");
}

export async function createPage(
  userId: string,
  input: {
    title?: string;
    parentId?: string | null;
    icon?: string | null;
    isPrivate?: boolean;
    createdBy?: PageAuthor;
  }
) {
  await assertOwnedParent(userId, input.parentId);
  const last = await prisma.page.findFirst({
    where: { userId, parentId: input.parentId ?? null, trashedAt: null },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  return prisma.page.create({
    data: {
      userId,
      parentId: input.parentId ?? null,
      title: input.title?.trim().slice(0, 240) || "Untitled",
      icon: input.icon?.slice(0, 32) || null,
      isPrivate: input.isPrivate === true,
      createdBy: input.createdBy ?? PageAuthor.HUMAN,
      position: (last?.position ?? 0) + 1024,
      blocks: {
        create: {
          type: PageBlockType.PARAGRAPH,
          content: { text: "" },
          position: 1024,
          createdBy: input.createdBy ?? PageAuthor.HUMAN,
        },
      },
    },
    include: pageDetailInclude,
  });
}

export async function updatePage(
  userId: string,
  pageId: string,
  input: {
    title?: string;
    icon?: string | null;
    coverUrl?: string | null;
    parentId?: string | null;
    isPrivate?: boolean;
    isFavorite?: boolean;
    position?: number;
    trashed?: boolean;
  }
) {
  const existing = await getPage(userId, pageId);
  if (!existing) return null;
  if (input.parentId === pageId) throw new Error("A page cannot contain itself");
  if (input.parentId !== undefined) {
    await assertOwnedParent(userId, input.parentId);
  }
  return prisma.page.update({
    where: { id: pageId },
    data: {
      ...(input.title !== undefined
        ? { title: input.title.trim().slice(0, 240) || "Untitled" }
        : {}),
      ...(input.icon !== undefined ? { icon: input.icon?.slice(0, 32) || null } : {}),
      ...(input.coverUrl !== undefined ? { coverUrl: input.coverUrl || null } : {}),
      ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
      ...(input.isPrivate !== undefined ? { isPrivate: input.isPrivate } : {}),
      ...(input.isFavorite !== undefined ? { isFavorite: input.isFavorite } : {}),
      ...(Number.isFinite(input.position) ? { position: input.position } : {}),
      ...(input.trashed !== undefined
        ? { trashedAt: input.trashed ? new Date() : null }
        : {}),
    },
    include: pageDetailInclude,
  });
}

export async function replacePageBlocks(
  userId: string,
  pageId: string,
  blocks: PageBlockInput[],
  createdBy: PageAuthor = PageAuthor.HUMAN
) {
  const page = await getPage(userId, pageId);
  if (!page) return null;
  if (blocks.length > 2_000) throw new Error("Page has too many blocks");

  const normalized = blocks.map((block, index) => ({
    id: block.id,
    type: block.type,
    content: block.content,
    position: Number.isFinite(block.position) ? block.position : (index + 1) * 1024,
    createdBy: block.createdBy ?? createdBy,
  }));

  return prisma.$transaction(async (tx) => {
    await tx.pageRevision.create({
      data: {
        pageId,
        userId,
        createdBy,
        snapshot: {
          title: page.title,
          icon: page.icon,
          blocks: page.blocks.map((block) => ({
            type: block.type,
            content: block.content,
            position: block.position,
            createdBy: block.createdBy,
          })),
        },
      },
    });
    await tx.pageBlock.deleteMany({ where: { pageId } });
    if (normalized.length > 0) {
      await tx.pageBlock.createMany({
        data: normalized.map((block) => ({
          pageId,
          type: block.type,
          content: block.content,
          position: block.position,
          createdBy: block.createdBy,
        })),
      });
    }
    await tx.page.update({ where: { id: pageId }, data: { updatedAt: new Date() } });
    return tx.page.findUnique({ where: { id: pageId }, include: pageDetailInclude });
  });
}

export async function createDatabase(
  userId: string,
  input: { title?: string; parentId?: string | null; isPrivate?: boolean }
) {
  const page = await createPage(userId, input);
  return prisma.page.update({
    where: { id: page.id },
    data: {
      database: {
        create: {
          properties: {
            create: [
              { name: "Name", type: DatabasePropertyType.TITLE, position: 1024 },
              { name: "Status", type: DatabasePropertyType.SELECT, position: 2048 },
              { name: "Date", type: DatabasePropertyType.DATE, position: 3072 },
            ],
          },
          views: {
            create: {
              name: "Table",
              type: DatabaseViewType.TABLE,
              position: 1024,
            },
          },
        },
      },
    },
    include: pageDetailInclude,
  });
}

export async function listAiReadablePages(userId: string, query?: string) {
  const pages = await prisma.page.findMany({
    where: {
      userId,
      trashedAt: null,
    },
    include: { blocks: { orderBy: { position: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });
  const byId = new Map(pages.map((page) => [page.id, page]));
  const isPrivateTree = (page: (typeof pages)[number]) => {
    let cursor: (typeof pages)[number] | undefined = page;
    const visited = new Set<string>();
    while (cursor) {
      if (cursor.isPrivate) return true;
      if (!cursor.parentId || visited.has(cursor.parentId)) return false;
      visited.add(cursor.parentId);
      cursor = byId.get(cursor.parentId);
    }
    return false;
  };
  const normalizedQuery = query?.trim().toLocaleLowerCase();
  return pages
    .filter(
      (page) =>
        !isPrivateTree(page) &&
        (!normalizedQuery ||
          page.title.toLocaleLowerCase().includes(normalizedQuery))
    )
    .slice(0, 50);
}

export async function createAiProposal(
  userId: string,
  pageId: string,
  input: { summary: string; operations: Prisma.InputJsonValue }
) {
  const page = await prisma.page.findFirst({
    where: { id: pageId, userId, trashedAt: null },
    select: { id: true, parentId: true, isPrivate: true },
  });
  if (!page) throw new Error("Page is private or unavailable");
  let cursor: { id: string; parentId: string | null; isPrivate: boolean } | null = page;
  const visited = new Set<string>();
  while (cursor) {
    if (cursor.isPrivate) throw new Error("Page is private or unavailable");
    if (!cursor.parentId || visited.has(cursor.parentId)) break;
    visited.add(cursor.parentId);
    cursor = await prisma.page.findFirst({
      where: { id: cursor.parentId, userId, trashedAt: null },
      select: { id: true, parentId: true, isPrivate: true },
    });
  }
  return prisma.aiPageChangeProposal.create({
    data: {
      userId,
      pageId,
      summary: input.summary.slice(0, 500),
      operations: input.operations,
    },
  });
}

export async function rejectAiProposal(userId: string, proposalId: string) {
  const proposal = await prisma.aiPageChangeProposal.findFirst({
    where: { id: proposalId, userId, status: AiProposalStatus.PENDING },
  });
  if (!proposal) return null;
  return prisma.aiPageChangeProposal.update({
    where: { id: proposalId },
    data: { status: AiProposalStatus.REJECTED },
  });
}

export async function getAiProposal(userId: string, proposalId: string) {
  return prisma.aiPageChangeProposal.findFirst({
    where: { id: proposalId, userId },
    include: {
      page: {
        select: { id: true, title: true, isPrivate: true, updatedAt: true },
      },
    },
  });
}

export async function applyAiProposal(userId: string, proposalId: string) {
  const proposal = await getAiProposal(userId, proposalId);
  if (
    !proposal ||
    proposal.status !== AiProposalStatus.PENDING ||
    proposal.page.isPrivate
  ) {
    return null;
  }
  const operations = Array.isArray(proposal.operations)
    ? proposal.operations
    : [];
  const blocks: PageBlockInput[] = [];
  for (const operation of operations) {
    if (!operation || typeof operation !== "object" || Array.isArray(operation)) continue;
    const candidate = operation as Prisma.JsonObject;
    if (candidate.type !== "append_block") continue;
    const blockType = candidate.blockType;
    if (
      typeof blockType !== "string" ||
      !Object.values(PageBlockType).includes(blockType as PageBlockType)
    ) {
      continue;
    }
    blocks.push({
      type: blockType as PageBlockType,
      content: JSON.parse(JSON.stringify(candidate.content ?? { text: "" })),
      position: 0,
      createdBy: PageAuthor.AI,
    });
  }

  const page = await getPage(userId, proposal.pageId);
  if (!page) return null;
  if (blocks.length > 0) {
    await replacePageBlocks(
      userId,
      page.id,
      [
        ...page.blocks.map((block) => ({
          type: block.type,
          content: JSON.parse(JSON.stringify(block.content)),
          position: block.position,
          createdBy: block.createdBy,
        })),
        ...blocks.map((block, index) => ({
          ...block,
          position: (page.blocks.at(-1)?.position ?? 0) + (index + 1) * 1024,
        })),
      ],
      PageAuthor.AI
    );
  }
  return prisma.aiPageChangeProposal.update({
    where: { id: proposalId },
    data: { status: AiProposalStatus.APPLIED, appliedAt: new Date() },
  });
}
