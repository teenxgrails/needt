import { WorkspaceKind, WorkspaceRole } from "@prisma/client";
import type { NextRequest } from "next/server";

import { isFeatureEnabled } from "@/lib/feature-flags";
import { prisma } from "@/lib/prisma";

export const WORKSPACES_FEATURE_FLAG = "workspaces";
export const WORKSPACE_HEADER = "x-workspace-id";

const ROLE_RANK: Record<WorkspaceRole, number> = {
  [WorkspaceRole.VIEWER]: 0,
  [WorkspaceRole.EDITOR]: 1,
  [WorkspaceRole.OWNER]: 2,
};

export type WorkspaceDataScope =
  | { mode: "legacy"; userId: string }
  | { mode: "workspace"; workspaceId: string };

export interface WorkspaceAccess {
  enabled: boolean;
  workspaceId: string;
  workspaceKind: WorkspaceKind;
  role: WorkspaceRole;
  dataScope: WorkspaceDataScope;
}

export function workspaceDataScopeWhere(
  access: WorkspaceAccess | undefined,
  legacyUserId: string
) {
  return access?.dataScope.mode === "workspace"
    ? { workspaceId: access.dataScope.workspaceId }
    : { userId: legacyUserId };
}

export class WorkspaceAuthorizationError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 403,
    public readonly code:
      | "INVALID_WORKSPACE_REQUEST"
      | "WORKSPACE_ACCESS_DENIED"
      | "WORKSPACE_ROLE_REQUIRED"
  ) {
    super(message);
    this.name = "WorkspaceAuthorizationError";
  }
}

export function requestedWorkspaceId(request: NextRequest): string | undefined {
  const headerId = request.headers.get(WORKSPACE_HEADER)?.trim() || undefined;
  const queryId =
    request.nextUrl.searchParams.get("workspaceId")?.trim() || undefined;

  if (headerId && queryId && headerId !== queryId) {
    throw new WorkspaceAuthorizationError(
      "Conflicting workspace identifiers.",
      400,
      "INVALID_WORKSPACE_REQUEST"
    );
  }

  return headerId ?? queryId;
}

async function ensurePersonalWorkspace(userId: string) {
  const workspace = await prisma.workspace.upsert({
    where: { personalOwnerId: userId },
    update: {},
    create: {
      name: "Personal Workspace",
      kind: WorkspaceKind.PERSONAL,
      personalOwnerId: userId,
    },
    select: { id: true, kind: true },
  });
  const membership = await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: { workspaceId: workspace.id, userId },
    },
    update: { role: WorkspaceRole.OWNER },
    create: {
      workspaceId: workspace.id,
      userId,
      role: WorkspaceRole.OWNER,
    },
    select: { role: true },
  });
  return { ...workspace, role: membership.role };
}

function requireRole(access: WorkspaceAccess, requiredRole: WorkspaceRole) {
  if (ROLE_RANK[access.role] < ROLE_RANK[requiredRole]) {
    throw new WorkspaceAuthorizationError(
      "The requested workspace role is required.",
      403,
      "WORKSPACE_ROLE_REQUIRED"
    );
  }
  return access;
}

export async function resolveWorkspaceAccess(input: {
  userId: string;
  requestedWorkspaceId?: string;
  requiredRole?: WorkspaceRole;
}): Promise<WorkspaceAccess> {
  const personal = await ensurePersonalWorkspace(input.userId);
  const enabled = await isFeatureEnabled(
    WORKSPACES_FEATURE_FLAG,
    input.userId
  );
  const requiredRole = input.requiredRole ?? WorkspaceRole.VIEWER;

  if (!enabled) {
    return requireRole(
      {
        enabled: false,
        workspaceId: personal.id,
        workspaceKind: personal.kind,
        role: personal.role,
        dataScope: { mode: "legacy", userId: input.userId },
      },
      requiredRole
    );
  }

  const workspaceId = input.requestedWorkspaceId ?? personal.id;
  if (workspaceId === personal.id) {
    return requireRole(
      {
        enabled: true,
        workspaceId: personal.id,
        workspaceKind: personal.kind,
        role: personal.role,
        dataScope: { mode: "workspace", workspaceId: personal.id },
      },
      requiredRole
    );
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId: input.userId },
    },
    select: {
      role: true,
      workspace: { select: { id: true, kind: true } },
    },
  });
  if (!membership) {
    throw new WorkspaceAuthorizationError(
      "Workspace access denied.",
      403,
      "WORKSPACE_ACCESS_DENIED"
    );
  }

  return requireRole(
    {
      enabled: true,
      workspaceId: membership.workspace.id,
      workspaceKind: membership.workspace.kind,
      role: membership.role,
      dataScope: {
        mode: "workspace",
        workspaceId: membership.workspace.id,
      },
    },
    requiredRole
  );
}
