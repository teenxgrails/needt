import type { PageActor } from "@/services/pages/page-service";
import { PageAccessRole, Prisma } from "@prisma/client";

import { resolvePageAccess } from "@/lib/auth/page-auth";
import { workspaceDataScopeWhere } from "@/lib/auth/workspace-auth";
import { prisma } from "@/lib/prisma";

const SMART_FOLDER_QUERY_VERSION = 1;

export interface PageSmartFolderQuery {
  version: typeof SMART_FOLDER_QUERY_VERSION;
  folderId?: string;
  tagIds?: string[];
  favorites?: boolean;
  privateOnly?: boolean;
}

export class PageMetadataError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INVALID_PAGE_METADATA_QUERY"
      | "PAGE_METADATA_NOT_FOUND"
      | "PAGE_METADATA_ACCESS_DENIED"
  ) {
    super(message);
  }
}

function actorUserId(actor: PageActor) {
  return typeof actor === "string" ? actor : actor.userId;
}

function scopeWhere(actor: PageActor) {
  return typeof actor === "string"
    ? { userId: actor }
    : workspaceDataScopeWhere(actor.workspace, actor.userId);
}

function scopeCreate(actor: PageActor) {
  const userId = actorUserId(actor);
  return {
    userId,
    ...(typeof actor !== "string" &&
      actor.workspace?.dataScope.mode === "workspace" && {
        workspaceId: actor.workspace.workspaceId,
      }),
  };
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((entry) => typeof entry === "string" && entry.length > 0)
  );
}

/** Accept only known, versioned query fields so an old Smart Folder can never
 * become a broader query when the schema evolves. */
export function parsePageSmartFolderQuery(
  value: unknown
): PageSmartFolderQuery {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PageMetadataError(
      "Smart Folder query must be an object.",
      "INVALID_PAGE_METADATA_QUERY"
    );
  }
  const query = value as Record<string, unknown>;
  const allowedKeys = new Set([
    "version",
    "folderId",
    "tagIds",
    "favorites",
    "privateOnly",
  ]);
  if (Object.keys(query).some((key) => !allowedKeys.has(key))) {
    throw new PageMetadataError(
      "Smart Folder query contains unsupported fields.",
      "INVALID_PAGE_METADATA_QUERY"
    );
  }
  if (query.version !== SMART_FOLDER_QUERY_VERSION) {
    throw new PageMetadataError(
      "Smart Folder query version is unsupported.",
      "INVALID_PAGE_METADATA_QUERY"
    );
  }
  if (query.folderId !== undefined && typeof query.folderId !== "string") {
    throw new PageMetadataError(
      "Smart Folder folder must be a string.",
      "INVALID_PAGE_METADATA_QUERY"
    );
  }
  if (query.tagIds !== undefined && !isStringArray(query.tagIds)) {
    throw new PageMetadataError(
      "Smart Folder tags must be string identifiers.",
      "INVALID_PAGE_METADATA_QUERY"
    );
  }
  if (query.favorites !== undefined && typeof query.favorites !== "boolean") {
    throw new PageMetadataError(
      "Smart Folder favorites must be boolean.",
      "INVALID_PAGE_METADATA_QUERY"
    );
  }
  if (
    query.privateOnly !== undefined &&
    typeof query.privateOnly !== "boolean"
  ) {
    throw new PageMetadataError(
      "Smart Folder privacy filter must be boolean.",
      "INVALID_PAGE_METADATA_QUERY"
    );
  }
  return query as unknown as PageSmartFolderQuery;
}

async function assertCurrentScopeFolder(actor: PageActor, folderId: string) {
  const folder = await prisma.pageFolder.findFirst({
    where: { id: folderId, ...scopeWhere(actor), archivedAt: null },
    select: { id: true },
  });
  if (!folder) {
    throw new PageMetadataError(
      "Page folder not found.",
      "PAGE_METADATA_NOT_FOUND"
    );
  }
}

async function assertCurrentScopeTags(actor: PageActor, tagIds: string[]) {
  const uniqueTagIds = [...new Set(tagIds)];
  if (uniqueTagIds.length === 0) return;
  const count = await prisma.pageTag.count({
    where: {
      id: { in: uniqueTagIds },
      ...scopeWhere(actor),
      archivedAt: null,
    },
  });
  if (count !== uniqueTagIds.length) {
    throw new PageMetadataError(
      "One or more Page tags are unavailable.",
      "PAGE_METADATA_NOT_FOUND"
    );
  }
}

export async function listPageMetadata(actor: PageActor) {
  const scope = scopeWhere(actor);
  const [folders, tags, smartFolders] = await Promise.all([
    prisma.pageFolder.findMany({
      where: { ...scope, archivedAt: null },
      select: { id: true, name: true, color: true, position: true },
      orderBy: [{ position: "asc" }, { name: "asc" }],
    }),
    prisma.pageTag.findMany({
      where: { ...scope, archivedAt: null },
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    }),
    prisma.pageSmartFolder.findMany({
      where: { ...scope, archivedAt: null },
      select: {
        id: true,
        name: true,
        queryVersion: true,
        query: true,
        position: true,
      },
      orderBy: [{ position: "asc" }, { name: "asc" }],
    }),
  ]);
  return {
    folders,
    tags,
    smartFolders: smartFolders.map((folder) => ({
      ...folder,
      query: parsePageSmartFolderQuery(folder.query),
    })),
  };
}

export async function createPageFolder(
  actor: PageActor,
  input: { name: string; color?: string | null }
) {
  const last = await prisma.pageFolder.findFirst({
    where: { ...scopeWhere(actor), archivedAt: null },
    select: { position: true },
    orderBy: { position: "desc" },
  });
  return prisma.pageFolder.create({
    data: {
      ...scopeCreate(actor),
      name: input.name.trim().slice(0, 80),
      color: input.color?.slice(0, 32) || null,
      position: (last?.position ?? 0) + 1024,
    },
  });
}

export async function createPageTag(
  actor: PageActor,
  input: { name: string; color?: string | null }
) {
  return prisma.pageTag.create({
    data: {
      ...scopeCreate(actor),
      name: input.name.trim().slice(0, 80),
      color: input.color?.slice(0, 32) || null,
    },
  });
}

export async function createPageSmartFolder(
  actor: PageActor,
  input: { name: string; query: unknown }
) {
  const query = parsePageSmartFolderQuery(input.query);
  if (query.folderId) await assertCurrentScopeFolder(actor, query.folderId);
  await assertCurrentScopeTags(actor, query.tagIds ?? []);
  const last = await prisma.pageSmartFolder.findFirst({
    where: { ...scopeWhere(actor), archivedAt: null },
    select: { position: true },
    orderBy: { position: "desc" },
  });
  return prisma.pageSmartFolder.create({
    data: {
      ...scopeCreate(actor),
      name: input.name.trim().slice(0, 80),
      queryVersion: SMART_FOLDER_QUERY_VERSION,
      query: query as unknown as Prisma.InputJsonValue,
      position: (last?.position ?? 0) + 1024,
    },
  });
}

export async function updatePageOrganization(
  actor: PageActor,
  pageId: string,
  input: { folderId?: string | null; tagIds?: string[] }
) {
  if (
    typeof actor === "string" ||
    !(await resolvePageAccess(actor, pageId, PageAccessRole.EDITOR))
  ) {
    throw new PageMetadataError(
      "Page access denied.",
      "PAGE_METADATA_ACCESS_DENIED"
    );
  }
  if (input.folderId) await assertCurrentScopeFolder(actor, input.folderId);
  const tagIds = input.tagIds ? [...new Set(input.tagIds)] : undefined;
  if (tagIds) await assertCurrentScopeTags(actor, tagIds);
  return prisma.page.update({
    where: { id: pageId },
    data: {
      ...(input.folderId !== undefined ? { folderId: input.folderId } : {}),
      ...(tagIds !== undefined
        ? { tags: { set: tagIds.map((id) => ({ id })) } }
        : {}),
    },
    select: {
      id: true,
      folderId: true,
      tags: { select: { id: true, name: true, color: true } },
    },
  });
}
