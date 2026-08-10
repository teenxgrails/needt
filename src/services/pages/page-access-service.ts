import { PageAccessRole } from "@prisma/client";

import { type PageAccessActor, resolvePageAccess } from "@/lib/auth/page-auth";
import { workspaceDataScopeWhere } from "@/lib/auth/workspace-auth";
import { prisma } from "@/lib/prisma";

export class PageAccessServiceError extends Error {
  constructor(
    public readonly code:
      | "PAGE_NOT_FOUND"
      | "PAGE_FULL_ACCESS_REQUIRED"
      | "WORKSPACE_MEMBER_REQUIRED"
      | "PAGE_OWNER_ACCESS_FIXED",
    public readonly status: 403 | 404
  ) {
    super(code);
    this.name = "PageAccessServiceError";
  }
}

async function requireFullAccess(actor: PageAccessActor, pageId: string) {
  const access = await resolvePageAccess(
    actor,
    pageId,
    PageAccessRole.FULL_ACCESS
  );
  if (!access) {
    throw new PageAccessServiceError("PAGE_FULL_ACCESS_REQUIRED", 403);
  }
  const page = await prisma.page.findFirst({
    where: {
      id: pageId,
      ...workspaceDataScopeWhere(actor.workspace, actor.userId),
      trashedAt: null,
    },
    select: { id: true, userId: true, workspaceId: true },
  });
  if (!page) throw new PageAccessServiceError("PAGE_NOT_FOUND", 404);
  return page;
}

export async function listPageAccessGrants(
  actor: PageAccessActor,
  pageId: string
) {
  const page = await requireFullAccess(actor, pageId);
  const grants = await prisma.pageAccessGrant.findMany({
    where: { pageId },
    select: {
      userId: true,
      role: true,
      user: { select: { name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return { ownerId: page.userId, grants };
}

export async function setPageAccessGrant(
  actor: PageAccessActor,
  pageId: string,
  userId: string,
  role: PageAccessRole
) {
  const page = await requireFullAccess(actor, pageId);
  if (page.userId === userId) {
    throw new PageAccessServiceError("PAGE_OWNER_ACCESS_FIXED", 403);
  }
  if (!page.workspaceId) {
    throw new PageAccessServiceError("WORKSPACE_MEMBER_REQUIRED", 403);
  }
  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId: page.workspaceId, userId },
    },
    select: { userId: true },
  });
  if (!member) {
    throw new PageAccessServiceError("WORKSPACE_MEMBER_REQUIRED", 403);
  }
  return prisma.pageAccessGrant.upsert({
    where: { pageId_userId: { pageId, userId } },
    create: { pageId, userId, role, grantedById: actor.userId },
    update: { role, grantedById: actor.userId },
    select: {
      userId: true,
      role: true,
      user: { select: { name: true, email: true, image: true } },
    },
  });
}

export async function removePageAccessGrant(
  actor: PageAccessActor,
  pageId: string,
  userId: string
) {
  const page = await requireFullAccess(actor, pageId);
  if (page.userId === userId) {
    throw new PageAccessServiceError("PAGE_OWNER_ACCESS_FIXED", 403);
  }
  await prisma.pageAccessGrant.deleteMany({ where: { pageId, userId } });
}
