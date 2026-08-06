import {
  AiProposalStatus,
  DatabasePropertyType,
  DatabaseViewType,
  PageAccessRole,
  PageAuthor,
  PageBlockType,
  Prisma,
} from "@prisma/client";

import { pageVisibilityWhere, resolvePageAccess } from "@/lib/auth/page-auth";
import { type WorkspaceAccess } from "@/lib/auth/workspace-auth";
import { prisma } from "@/lib/prisma";
import { pageBlocksToCollaborationState } from "@/services/pages/page-collaboration-document";

export type PageActor =
  | string
  | {
      userId: string;
      workspace?: WorkspaceAccess;
    };

function actorUserId(actor: PageActor) {
  return typeof actor === "string" ? actor : actor.userId;
}

function actorPageScope(actor: PageActor) {
  const userId = actorUserId(actor);
  return typeof actor === "string" ? { userId } : pageVisibilityWhere(actor);
}

async function actorCanAccess(
  actor: PageActor,
  pageId: string,
  role: PageAccessRole
) {
  if (typeof actor === "string") {
    return prisma.page.findFirst({
      where: { id: pageId, userId: actor, trashedAt: null },
      select: { id: true },
    });
  }
  return resolvePageAccess(actor, pageId, role);
}

function actorWorkspaceId(actor: PageActor) {
  return typeof actor === "string" ? undefined : actor.workspace?.workspaceId;
}

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

export async function listPages(
  actor: PageActor,
  options?: { search?: string }
) {
  return prisma.page.findMany({
    where: {
      ...actorPageScope(actor),
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
    orderBy: [
      { isFavorite: "desc" },
      { position: "asc" },
      { updatedAt: "desc" },
    ],
  });
}

export async function getPage(actor: PageActor, pageId: string) {
  return prisma.page.findFirst({
    where: { id: pageId, ...actorPageScope(actor), trashedAt: null },
    include: pageDetailInclude,
  });
}

async function assertOwnedParent(actor: PageActor, parentId?: string | null) {
  if (!parentId) return;
  const parent = await actorCanAccess(actor, parentId, PageAccessRole.EDITOR);
  if (!parent) throw new Error("Parent page not found");
}

export async function createPage(
  actor: PageActor,
  input: {
    title?: string;
    parentId?: string | null;
    icon?: string | null;
    isPrivate?: boolean;
    createdBy?: PageAuthor;
  }
) {
  const userId = actorUserId(actor);
  await assertOwnedParent(actor, input.parentId);
  const last = await prisma.page.findFirst({
    where: {
      ...actorPageScope(actor),
      parentId: input.parentId ?? null,
      trashedAt: null,
    },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  return prisma.page.create({
    data: {
      userId,
      ...(actorWorkspaceId(actor) && { workspaceId: actorWorkspaceId(actor) }),
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
  actor: PageActor,
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
  const requiredRole =
    input.isPrivate !== undefined || input.trashed !== undefined
      ? PageAccessRole.FULL_ACCESS
      : PageAccessRole.EDITOR;
  if (!(await actorCanAccess(actor, pageId, requiredRole))) return null;
  const existing = await getPage(actor, pageId);
  if (!existing) return null;
  if (input.parentId === pageId)
    throw new Error("A page cannot contain itself");
  if (input.parentId !== undefined) {
    await assertOwnedParent(actor, input.parentId);
  }
  return prisma.page.update({
    where: { id: pageId },
    data: {
      ...(input.title !== undefined
        ? { title: input.title.trim().slice(0, 240) || "Untitled" }
        : {}),
      ...(input.icon !== undefined
        ? { icon: input.icon?.slice(0, 32) || null }
        : {}),
      ...(input.coverUrl !== undefined
        ? { coverUrl: input.coverUrl || null }
        : {}),
      ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
      ...(input.isPrivate !== undefined ? { isPrivate: input.isPrivate } : {}),
      ...(input.isFavorite !== undefined
        ? { isFavorite: input.isFavorite }
        : {}),
      ...(Number.isFinite(input.position) ? { position: input.position } : {}),
      ...(input.trashed !== undefined
        ? { trashedAt: input.trashed ? new Date() : null }
        : {}),
    },
    include: pageDetailInclude,
  });
}

export async function replacePageBlocks(
  actor: PageActor,
  pageId: string,
  blocks: PageBlockInput[],
  createdBy: PageAuthor = PageAuthor.HUMAN,
  documentFormatVersion: 1 | 2 = 1,
  options: { syncCollaborationState?: boolean } = {}
) {
  if (!(await actorCanAccess(actor, pageId, PageAccessRole.EDITOR)))
    return null;
  const userId = actorUserId(actor);
  const page = await getPage(actor, pageId);
  if (!page) return null;
  if (blocks.length > 2_000) throw new Error("Page has too many blocks");

  const normalized = blocks.map((block, index) => ({
    id: block.id,
    parentBlockId: block.parentBlockId ?? null,
    type: block.type,
    content: block.content,
    position: Number.isFinite(block.position)
      ? block.position
      : (index + 1) * 1024,
    createdBy: block.createdBy ?? createdBy,
  }));

  return prisma.$transaction(async (tx) => {
    if (page.documentFormatVersion !== documentFormatVersion) {
      await tx.page.update({
        where: { id: pageId },
        data: { documentFormatVersion },
      });
    }
    await tx.pageRevision.create({
      data: {
        pageId,
        userId,
        createdBy,
        snapshot: {
          title: page.title,
          icon: page.icon,
          blocks: page.blocks.map((block) => ({
            id: block.id,
            parentBlockId: block.parentBlockId,
            type: block.type,
            content: block.content,
            position: block.position,
            createdBy: block.createdBy,
          })),
        },
      },
    });

    const requestedIds = normalized
      .map((block) => block.id)
      .filter((id): id is string => Boolean(id));
    if (new Set(requestedIds).size !== requestedIds.length) {
      throw new PageBlockIdentityError("Page block IDs must be unique");
    }
    const foreignBlocks = requestedIds.length
      ? await tx.pageBlock.count({
          where: { id: { in: requestedIds }, pageId: { not: pageId } },
        })
      : 0;
    if (foreignBlocks > 0) {
      throw new Error("A page block ID belongs to another page");
    }

    // Detach first so removing a parent never cascades into a retained child.
    await tx.pageBlock.updateMany({
      where: { pageId },
      data: { parentBlockId: null },
    });
    await tx.pageBlock.deleteMany({
      where: {
        pageId,
        ...(requestedIds.length > 0 ? { id: { notIn: requestedIds } } : {}),
      },
    });

    const reconciledIds: string[] = [];
    for (const block of normalized) {
      if (block.id) {
        await tx.pageBlock.upsert({
          where: { id: block.id },
          update: {
            type: block.type,
            content: block.content,
            position: block.position,
            createdBy: block.createdBy,
          },
          create: {
            id: block.id,
            pageId,
            type: block.type,
            content: block.content,
            position: block.position,
            createdBy: block.createdBy,
          },
        });
        reconciledIds.push(block.id);
      } else {
        const created = await tx.pageBlock.create({
          data: {
            pageId,
            type: block.type,
            content: block.content,
            position: block.position,
            createdBy: block.createdBy,
          },
          select: { id: true },
        });
        reconciledIds.push(created.id);
      }
    }

    const idByInput = normalized.map((block, index) => ({
      id: reconciledIds[index],
      parentBlockId: block.parentBlockId,
    }));
    const validIds = new Set(reconciledIds);
    for (const block of idByInput) {
      if (!block.parentBlockId) continue;
      if (!validIds.has(block.parentBlockId)) {
        throw new Error("Parent block must belong to the same page");
      }
      if (block.parentBlockId === block.id) {
        throw new Error("A page block cannot contain itself");
      }
      await tx.pageBlock.update({
        where: { id: block.id },
        data: { parentBlockId: block.parentBlockId },
      });
    }
    await tx.page.update({
      where: { id: pageId },
      data: { updatedAt: new Date() },
    });
    if (options.syncCollaborationState !== false) {
      const state = pageBlocksToCollaborationState(
        normalized.map((block, index) => ({
          id: reconciledIds[index],
          parentBlockId: block.parentBlockId,
          type: block.type,
          content: block.content,
          position: block.position,
          createdBy: block.createdBy,
        }))
      );
      await tx.pageCollaborationState.upsert({
        where: { pageId },
        create: { pageId, state: Buffer.from(state) },
        update: { state: Buffer.from(state) },
      });
    }
    return tx.page.findUnique({
      where: { id: pageId },
      include: pageDetailInclude,
    });
  });
}

export class PageBlockIdentityError extends Error {
  readonly code = "DUPLICATE_BLOCK_ID";
}

export async function createDatabase(
  actor: PageActor,
  input: { title?: string; parentId?: string | null; isPrivate?: boolean }
) {
  const page = await createPage(actor, input);
  return prisma.page.update({
    where: { id: page.id },
    data: {
      database: {
        create: {
          properties: {
            create: [
              {
                name: "Name",
                type: DatabasePropertyType.TITLE,
                position: 1024,
              },
              {
                name: "Status",
                type: DatabasePropertyType.SELECT,
                position: 2048,
              },
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

export async function listAiReadablePages(actor: PageActor, query?: string) {
  const pages = await prisma.page.findMany({
    where: {
      ...actorPageScope(actor),
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
  actor: PageActor,
  pageId: string,
  input: { summary: string; operations: Prisma.InputJsonValue }
) {
  if (!(await actorCanAccess(actor, pageId, PageAccessRole.EDITOR))) {
    throw new Error("Page is private or unavailable");
  }
  const userId = actorUserId(actor);
  const page = await prisma.page.findFirst({
    where: { id: pageId, ...actorPageScope(actor), trashedAt: null },
    select: { id: true, parentId: true, isPrivate: true },
  });
  if (!page) throw new Error("Page is private or unavailable");
  let cursor: {
    id: string;
    parentId: string | null;
    isPrivate: boolean;
  } | null = page;
  const visited = new Set<string>();
  while (cursor) {
    if (cursor.isPrivate) throw new Error("Page is private or unavailable");
    if (!cursor.parentId || visited.has(cursor.parentId)) break;
    visited.add(cursor.parentId);
    cursor = await prisma.page.findFirst({
      where: {
        id: cursor.parentId,
        ...actorPageScope(actor),
        trashedAt: null,
      },
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

export async function rejectAiProposal(actor: PageActor, proposalId: string) {
  const userId = actorUserId(actor);
  const proposal = await prisma.aiPageChangeProposal.findFirst({
    where: { id: proposalId, userId, status: AiProposalStatus.PENDING },
  });
  if (!proposal) return null;
  if (!(await actorCanAccess(actor, proposal.pageId, PageAccessRole.VIEWER))) {
    return null;
  }
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

export async function applyAiProposal(actor: PageActor, proposalId: string) {
  const userId = actorUserId(actor);
  const proposal = await getAiProposal(userId, proposalId);
  if (!proposal || proposal.status !== AiProposalStatus.PENDING) {
    return null;
  }
  if (!(await actorCanAccess(actor, proposal.pageId, PageAccessRole.EDITOR))) {
    return null;
  }
  const operations = Array.isArray(proposal.operations)
    ? proposal.operations
    : [];
  const blocks: PageBlockInput[] = [];
  for (const operation of operations) {
    if (!operation || typeof operation !== "object" || Array.isArray(operation))
      continue;
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

  const page = await getPage(actor, proposal.pageId);
  if (!page) return null;
  let cursor: {
    id: string;
    parentId: string | null;
    isPrivate: boolean;
  } | null = page;
  const visited = new Set<string>();
  while (cursor) {
    if (cursor.isPrivate) return null;
    if (!cursor.parentId || visited.has(cursor.parentId)) break;
    visited.add(cursor.parentId);
    cursor = await prisma.page.findFirst({
      where: {
        id: cursor.parentId,
        ...actorPageScope(actor),
        trashedAt: null,
      },
      select: { id: true, parentId: true, isPrivate: true },
    });
  }
  if (blocks.length > 0) {
    await replacePageBlocks(
      actor,
      page.id,
      [
        ...page.blocks.map((block) => ({
          id: block.id,
          parentBlockId: block.parentBlockId,
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

export async function listPageRevisions(actor: PageActor, pageId: string) {
  const page = await prisma.page.findFirst({
    where: { id: pageId, ...actorPageScope(actor), trashedAt: null },
    select: { id: true },
  });
  if (!page) return null;
  return prisma.pageRevision.findMany({
    where: { pageId },
    select: { id: true, createdAt: true, createdBy: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function listPageBacklinks(actor: PageActor, pageId: string) {
  const pages = await prisma.page.findMany({
    where: { ...actorPageScope(actor), trashedAt: null, id: { not: pageId } },
    select: {
      id: true,
      title: true,
      icon: true,
      updatedAt: true,
      blocks: { select: { content: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return pages
    .filter((page) =>
      page.blocks.some((block) => {
        const content = JSON.stringify(block.content);
        return (
          content.includes(`\"pageId\":\"${pageId}\"`) ||
          content.includes(`\"url\":\"/pages/${pageId}\"`)
        );
      })
    )
    .map((page) => ({
      id: page.id,
      title: page.title,
      icon: page.icon,
      updatedAt: page.updatedAt,
    }));
}

export async function restorePageRevision(
  actor: PageActor,
  pageId: string,
  revisionId: string
) {
  if (!(await actorCanAccess(actor, pageId, PageAccessRole.EDITOR)))
    return null;
  const revision = await prisma.pageRevision.findFirst({
    where: {
      id: revisionId,
      pageId,
      page: { ...actorPageScope(actor), trashedAt: null },
    },
    select: {
      snapshot: true,
      page: { select: { documentFormatVersion: true } },
    },
  });
  if (
    !revision ||
    !revision.snapshot ||
    typeof revision.snapshot !== "object"
  ) {
    return null;
  }
  const snapshot = revision.snapshot as Prisma.JsonObject;
  const blocks = Array.isArray(snapshot.blocks)
    ? snapshot.blocks.filter(
        (block): block is Prisma.JsonObject =>
          Boolean(block) && typeof block === "object" && !Array.isArray(block)
      )
    : [];
  const restored = await replacePageBlocks(
    actor,
    pageId,
    blocks.flatMap((block, index) => {
      const type = block.type;
      const content = block.content;
      if (
        typeof type !== "string" ||
        !Object.values(PageBlockType).includes(type as PageBlockType) ||
        content === undefined
      ) {
        return [];
      }
      return [
        {
          id: typeof block.id === "string" ? block.id : undefined,
          parentBlockId:
            typeof block.parentBlockId === "string"
              ? block.parentBlockId
              : null,
          type: type as PageBlockType,
          content: JSON.parse(JSON.stringify(content)) as Prisma.InputJsonValue,
          position:
            typeof block.position === "number"
              ? block.position
              : (index + 1) * 1024,
          createdBy:
            block.createdBy === PageAuthor.AI
              ? PageAuthor.AI
              : PageAuthor.HUMAN,
        },
      ];
    }),
    PageAuthor.HUMAN,
    revision.page.documentFormatVersion === 2 ? 2 : 1
  );
  if (!restored) return null;
  return prisma.page.update({
    where: { id: pageId },
    data: {
      title:
        typeof snapshot.title === "string"
          ? snapshot.title.slice(0, 240) || "Untitled"
          : undefined,
      icon:
        typeof snapshot.icon === "string" ? snapshot.icon.slice(0, 32) : null,
    },
    include: pageDetailInclude,
  });
}
