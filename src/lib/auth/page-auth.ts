import { PageAccessRole, WorkspaceRole } from "@prisma/client";

import {
  type WorkspaceAccess,
  workspaceDataScopeWhere,
} from "@/lib/auth/workspace-auth";
import { prisma } from "@/lib/prisma";

export type PageAccessActor = {
  userId: string;
  workspace?: WorkspaceAccess;
};

const ROLE_RANK: Record<PageAccessRole, number> = {
  [PageAccessRole.VIEWER]: 0,
  [PageAccessRole.EDITOR]: 1,
  [PageAccessRole.FULL_ACCESS]: 2,
};

export function inheritedPageRole(role: WorkspaceRole): PageAccessRole {
  if (role === WorkspaceRole.OWNER) return PageAccessRole.FULL_ACCESS;
  if (role === WorkspaceRole.EDITOR) return PageAccessRole.EDITOR;
  return PageAccessRole.VIEWER;
}

export function pageVisibilityWhere(actor: PageAccessActor) {
  const scope = workspaceDataScopeWhere(actor.workspace, actor.userId);
  if (actor.workspace?.dataScope.mode !== "workspace") return scope;
  return {
    ...scope,
    OR: [
      { userId: actor.userId },
      { isPrivate: false },
      { accessGrants: { some: { userId: actor.userId } } },
    ],
  };
}

export async function resolvePageAccess(
  actor: PageAccessActor,
  pageId: string,
  requiredRole: PageAccessRole = PageAccessRole.VIEWER
) {
  const page = await prisma.page.findFirst({
    where: {
      id: pageId,
      ...workspaceDataScopeWhere(actor.workspace, actor.userId),
      trashedAt: null,
    },
    select: {
      id: true,
      userId: true,
      workspaceId: true,
      isPrivate: true,
      accessGrants: {
        where: { userId: actor.userId },
        select: { role: true },
        take: 1,
      },
    },
  });
  if (!page) return null;

  const directRole = page.accessGrants[0]?.role;
  const role =
    page.userId === actor.userId
      ? PageAccessRole.FULL_ACCESS
      : (directRole ??
        (page.isPrivate || !actor.workspace
          ? null
          : inheritedPageRole(actor.workspace.role)));
  if (!role || ROLE_RANK[role] < ROLE_RANK[requiredRole]) return null;
  return { pageId: page.id, role };
}

export function pageRoleAtLeast(
  role: PageAccessRole,
  requiredRole: PageAccessRole
) {
  return ROLE_RANK[role] >= ROLE_RANK[requiredRole];
}
