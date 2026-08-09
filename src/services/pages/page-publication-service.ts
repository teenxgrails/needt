import { PageAccessRole } from "@prisma/client";
import { randomBytes } from "node:crypto";

import { type PageAccessActor, resolvePageAccess } from "@/lib/auth/page-auth";
import { newDate } from "@/lib/date-utils";
import { publishPagePublicationRevoked } from "@/lib/pages/page-publication-realtime";
import { prisma } from "@/lib/prisma";

export type PublishedPageAvailability = "active" | "missing" | "revoked";

function publicAssetUrl(token: string, assetId: string) {
  return `/api/public/pages/${encodeURIComponent(token)}/assets/${encodeURIComponent(assetId)}`;
}

function rewritePublishedAssetUrls(
  value: unknown,
  pageId: string,
  token: string
): unknown {
  if (typeof value === "string") {
    const prefix = `/api/pages/${pageId}/assets/`;
    return value.startsWith(prefix)
      ? publicAssetUrl(token, value.slice(prefix.length))
      : value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) =>
      rewritePublishedAssetUrls(entry, pageId, token)
    );
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        rewritePublishedAssetUrls(entry, pageId, token),
      ])
    );
  }
  return value;
}

export async function getPagePublication(
  actor: PageAccessActor,
  pageId: string
) {
  if (!(await resolvePageAccess(actor, pageId, PageAccessRole.FULL_ACCESS))) {
    return null;
  }
  return prisma.pagePublication.findUnique({ where: { pageId } });
}

export async function publishPage(actor: PageAccessActor, pageId: string) {
  if (!(await resolvePageAccess(actor, pageId, PageAccessRole.FULL_ACCESS))) {
    return null;
  }
  const existing = await prisma.pagePublication.findUnique({
    where: { pageId },
  });
  if (existing && !existing.revokedAt) return existing;
  const data = {
    token: randomBytes(32).toString("base64url"),
    publishedById: actor.userId,
    publishedAt: newDate(),
    revokedAt: null,
  };
  if (existing) {
    await prisma.pagePublication.updateMany({
      where: { pageId, revokedAt: { not: null } },
      data,
    });
    return prisma.pagePublication.findUnique({ where: { pageId } });
  }
  try {
    return await prisma.pagePublication.create({
      data: {
        pageId,
        ...data,
      },
    });
  } catch (error) {
    if (
      !error ||
      typeof error !== "object" ||
      !("code" in error) ||
      error.code !== "P2002"
    ) {
      throw error;
    }
    return prisma.pagePublication.findUnique({ where: { pageId } });
  }
}

export async function unpublishPage(actor: PageAccessActor, pageId: string) {
  if (!(await resolvePageAccess(actor, pageId, PageAccessRole.FULL_ACCESS))) {
    return null;
  }
  const publication = await prisma.pagePublication.findUnique({
    where: { pageId },
  });
  if (!publication || publication.revokedAt) return publication;
  const revoked = await prisma.pagePublication.update({
    where: { pageId },
    data: { revokedAt: newDate() },
  });
  await publishPagePublicationRevoked(publication.token);
  return revoked;
}

export async function getPublishedPage(token: string) {
  const publication = await prisma.pagePublication.findFirst({
    where: {
      token,
      revokedAt: null,
      page: { trashedAt: null },
    },
    select: {
      page: {
        select: {
          id: true,
          title: true,
          icon: true,
          coverUrl: true,
          updatedAt: true,
          blocks: { orderBy: { position: "asc" } },
        },
      },
    },
  });
  if (!publication) return null;
  const page = publication.page;
  return {
    title: page.title,
    icon: page.icon,
    coverUrl: page.coverUrl,
    updatedAt: page.updatedAt,
    blocks: page.blocks.map((block) => ({
      id: block.id,
      parentBlockId: block.parentBlockId,
      type: block.type,
      content: rewritePublishedAssetUrls(block.content, page.id, token),
      position: block.position,
      createdBy: block.createdBy,
    })),
  };
}

export async function getPublishedPageAvailability(
  token: string
): Promise<PublishedPageAvailability> {
  const publication = await prisma.pagePublication.findUnique({
    where: { token },
    select: {
      revokedAt: true,
      page: { select: { trashedAt: true } },
    },
  });

  if (!publication) return "missing";
  if (publication.revokedAt || publication.page.trashedAt) return "revoked";
  return "active";
}
