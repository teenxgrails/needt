import {
  Prisma,
  SubscriptionPlan,
  WorkspaceKind,
  WorkspaceRole,
} from "@prisma/client";
import { createHash, randomBytes } from "crypto";

import {
  WORKSPACES_FEATURE_FLAG,
  resolveWorkspaceAccess,
} from "@/lib/auth/workspace-auth";
import { addDays, newDate } from "@/lib/date-utils";
import { getPlan } from "@/lib/entitlements";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { prisma } from "@/lib/prisma";

const INVITE_TTL_DAYS = 7;
const SERIALIZABLE_RETRIES = 3;

export class WorkspaceServiceError extends Error {
  constructor(
    public readonly code:
      | "WORKSPACES_DISABLED"
      | "SHARED_WORKSPACE_REQUIRES_PAID"
      | "INVITEE_NOT_FOUND"
      | "INVITEE_REQUIRES_PAID"
      | "INVITER_REQUIRES_PAID"
      | "PERSONAL_WORKSPACE_MEMBERS_FIXED"
      | "MEMBER_ALREADY_EXISTS"
      | "MEMBER_NOT_FOUND"
      | "LAST_OWNER"
      | "INVITE_NOT_FOUND"
      | "INVITE_EMAIL_MISMATCH"
      | "INVITE_EXPIRED"
      | "INVITE_ALREADY_USED"
      | "INVITE_ALREADY_DECLINED",
    public readonly status: 403 | 404 | 409
  ) {
    super(code);
    this.name = "WorkspaceServiceError";
  }
}

function isPaid(plan: SubscriptionPlan) {
  return plan === SubscriptionPlan.PRO || plan === SubscriptionPlan.LIFETIME;
}

async function requirePaid(
  userId: string,
  code:
    | "SHARED_WORKSPACE_REQUIRES_PAID"
    | "INVITEE_REQUIRES_PAID"
    | "INVITER_REQUIRES_PAID"
) {
  if (!isPaid(await getPlan(userId))) {
    throw new WorkspaceServiceError(code, 403);
  }
}

async function requireWorkspaceFeature(userId: string) {
  if (!(await isFeatureEnabled(WORKSPACES_FEATURE_FLAG, userId))) {
    throw new WorkspaceServiceError("WORKSPACES_DISABLED", 403);
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function isRetryableTransaction(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2034"
  );
}

async function serializableTransaction<T>(
  operation: (transaction: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  for (let attempt = 0; attempt < SERIALIZABLE_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        !isRetryableTransaction(error) ||
        attempt === SERIALIZABLE_RETRIES - 1
      ) {
        throw error;
      }
    }
  }
  throw new Error("Serializable transaction retry limit reached.");
}

export async function listUserWorkspaces(userId: string) {
  const [enabled, plan] = await Promise.all([
    isFeatureEnabled(WORKSPACES_FEATURE_FLAG, userId),
    getPlan(userId),
  ]);
  const canListShared = enabled && isPaid(plan);
  return prisma.workspaceMember.findMany({
    where: {
      userId,
      ...(!canListShared && { workspace: { kind: WorkspaceKind.PERSONAL } }),
    },
    select: {
      role: true,
      workspace: {
        select: { id: true, name: true, kind: true, createdAt: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function createSharedWorkspace(userId: string, name: string) {
  await Promise.all([
    requireWorkspaceFeature(userId),
    requirePaid(userId, "SHARED_WORKSPACE_REQUIRES_PAID"),
  ]);

  return prisma.$transaction(async (transaction) => {
    const workspace = await transaction.workspace.create({
      data: { name: name.trim(), kind: WorkspaceKind.SHARED },
      select: { id: true, name: true, kind: true, createdAt: true },
    });
    await transaction.workspaceMember.create({
      data: { workspaceId: workspace.id, userId, role: WorkspaceRole.OWNER },
    });
    return { ...workspace, role: WorkspaceRole.OWNER };
  });
}

async function requireSharedWorkspaceRole(
  userId: string,
  workspaceId: string,
  requiredRole: WorkspaceRole
) {
  await requireWorkspaceFeature(userId);
  const access = await resolveWorkspaceAccess({
    userId,
    requestedWorkspaceId: workspaceId,
    requiredRole,
  });
  if (access.workspaceKind !== WorkspaceKind.SHARED) {
    throw new WorkspaceServiceError("PERSONAL_WORKSPACE_MEMBERS_FIXED", 403);
  }
  return access;
}

export async function listWorkspaceMembers(
  userId: string,
  workspaceId: string
) {
  await requireSharedWorkspaceRole(userId, workspaceId, WorkspaceRole.VIEWER);
  return prisma.workspaceMember.findMany({
    where: { workspaceId },
    select: {
      userId: true,
      role: true,
      createdAt: true,
      user: { select: { name: true, email: true, image: true } },
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });
}

export async function listWorkspaceInvites(
  userId: string,
  workspaceId: string
) {
  await requireSharedWorkspaceRole(userId, workspaceId, WorkspaceRole.OWNER);
  const now = newDate();
  return prisma.workspaceInvite.findMany({
    where: {
      workspaceId,
      acceptedAt: null,
      declinedAt: null,
      expiresAt: { gt: now },
    },
    select: {
      id: true,
      email: true,
      role: true,
      expiresAt: true,
      acceptedAt: true,
      acceptedById: true,
      declinedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function revokeWorkspaceInvite(input: {
  userId: string;
  workspaceId: string;
  inviteId: string;
}) {
  await requireSharedWorkspaceRole(
    input.userId,
    input.workspaceId,
    WorkspaceRole.OWNER
  );
  return serializableTransaction(async (transaction) => {
    await requireOwnerInsideTransaction(
      transaction,
      input.userId,
      input.workspaceId
    );
    const now = newDate();
    const revoked = await transaction.workspaceInvite.updateMany({
      where: {
        id: input.inviteId,
        workspaceId: input.workspaceId,
        acceptedAt: null,
        declinedAt: null,
        expiresAt: { gt: now },
      },
      data: { expiresAt: now },
    });
    if (revoked.count !== 1) {
      throw new WorkspaceServiceError("INVITE_NOT_FOUND", 404);
    }
  });
}

export async function inviteWorkspaceMember(input: {
  userId: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
}) {
  await requireSharedWorkspaceRole(
    input.userId,
    input.workspaceId,
    WorkspaceRole.OWNER
  );
  await requirePaid(input.userId, "INVITER_REQUIRES_PAID");

  const email = normalizeEmail(input.email);
  const invitee = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!invitee) {
    throw new WorkspaceServiceError("INVITEE_NOT_FOUND", 404);
  }
  await requirePaid(invitee.id, "INVITEE_REQUIRES_PAID");

  const existingMember = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: input.workspaceId,
        userId: invitee.id,
      },
    },
    select: { id: true },
  });
  if (existingMember) {
    throw new WorkspaceServiceError("MEMBER_ALREADY_EXISTS", 409);
  }

  const token = randomBytes(32).toString("base64url");
  const now = newDate();
  const invite = await prisma.$transaction(async (transaction) => {
    await transaction.workspaceInvite.updateMany({
      where: {
        workspaceId: input.workspaceId,
        email,
        acceptedAt: null,
        expiresAt: { gt: now },
      },
      data: { expiresAt: now },
    });
    return transaction.workspaceInvite.create({
      data: {
        workspaceId: input.workspaceId,
        email,
        role: input.role,
        tokenHash: hashInviteToken(token),
        invitedById: input.userId,
        expiresAt: addDays(now, INVITE_TTL_DAYS),
      },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  });

  return { ...invite, token };
}

export async function acceptWorkspaceInvite(userId: string, token: string) {
  await requireWorkspaceFeature(userId);
  await requirePaid(userId, "INVITEE_REQUIRES_PAID");
  const tokenHash = hashInviteToken(token);
  const initialInvite = await prisma.workspaceInvite.findUnique({
    where: { tokenHash },
    select: { invitedById: true },
  });
  if (!initialInvite) {
    throw new WorkspaceServiceError("INVITE_NOT_FOUND", 404);
  }
  if (!initialInvite.invitedById) {
    throw new WorkspaceServiceError("INVITER_REQUIRES_PAID", 403);
  }
  await requirePaid(initialInvite.invitedById, "INVITER_REQUIRES_PAID");

  return serializableTransaction(async (transaction) => {
    const [invite, user] = await Promise.all([
      transaction.workspaceInvite.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          workspaceId: true,
          email: true,
          role: true,
          expiresAt: true,
          acceptedAt: true,
          declinedAt: true,
          workspace: { select: { name: true, kind: true } },
        },
      }),
      transaction.user.findUnique({
        where: { id: userId },
        select: { email: true },
      }),
    ]);
    if (!invite) {
      throw new WorkspaceServiceError("INVITE_NOT_FOUND", 404);
    }
    if (invite.acceptedAt) {
      throw new WorkspaceServiceError("INVITE_ALREADY_USED", 409);
    }
    if (invite.declinedAt) {
      throw new WorkspaceServiceError("INVITE_ALREADY_DECLINED", 409);
    }
    const now = newDate();
    if (invite.expiresAt <= now) {
      throw new WorkspaceServiceError("INVITE_EXPIRED", 409);
    }
    if (!user?.email || normalizeEmail(user.email) !== invite.email) {
      throw new WorkspaceServiceError("INVITE_EMAIL_MISMATCH", 403);
    }

    const consumed = await transaction.workspaceInvite.updateMany({
      where: {
        id: invite.id,
        acceptedAt: null,
        declinedAt: null,
        expiresAt: { gt: now },
      },
      data: { acceptedAt: now, acceptedById: userId },
    });
    if (consumed.count !== 1) {
      throw new WorkspaceServiceError("INVITE_ALREADY_USED", 409);
    }
    const membership = await transaction.workspaceMember.upsert({
      where: {
        workspaceId_userId: { workspaceId: invite.workspaceId, userId },
      },
      update: {},
      create: {
        workspaceId: invite.workspaceId,
        userId,
        role: invite.role,
      },
      select: { role: true },
    });
    return {
      workspaceId: invite.workspaceId,
      workspaceName: invite.workspace.name,
      role: membership.role,
    };
  });
}

export async function declineWorkspaceInvite(userId: string, token: string) {
  await requireWorkspaceFeature(userId);
  const tokenHash = hashInviteToken(token);

  return serializableTransaction(async (transaction) => {
    const [invite, user] = await Promise.all([
      transaction.workspaceInvite.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          email: true,
          expiresAt: true,
          acceptedAt: true,
          declinedAt: true,
        },
      }),
      transaction.user.findUnique({
        where: { id: userId },
        select: { email: true },
      }),
    ]);
    if (!invite) throw new WorkspaceServiceError("INVITE_NOT_FOUND", 404);
    if (invite.acceptedAt) {
      throw new WorkspaceServiceError("INVITE_ALREADY_USED", 409);
    }
    if (invite.declinedAt) {
      throw new WorkspaceServiceError("INVITE_ALREADY_DECLINED", 409);
    }
    const now = newDate();
    if (invite.expiresAt <= now) {
      throw new WorkspaceServiceError("INVITE_EXPIRED", 409);
    }
    if (!user?.email || normalizeEmail(user.email) !== invite.email) {
      throw new WorkspaceServiceError("INVITE_EMAIL_MISMATCH", 403);
    }

    const declined = await transaction.workspaceInvite.updateMany({
      where: {
        id: invite.id,
        acceptedAt: null,
        declinedAt: null,
        expiresAt: { gt: now },
      },
      data: { declinedAt: now },
    });
    if (declined.count !== 1) {
      throw new WorkspaceServiceError("INVITE_ALREADY_DECLINED", 409);
    }
  });
}

async function requireOwnerInsideTransaction(
  transaction: Prisma.TransactionClient,
  userId: string,
  workspaceId: string
) {
  const actor = await transaction.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true },
  });
  if (actor?.role !== WorkspaceRole.OWNER) {
    throw new WorkspaceServiceError("MEMBER_NOT_FOUND", 403);
  }
}

async function assertNotLastOwner(
  transaction: Prisma.TransactionClient,
  workspaceId: string,
  targetRole: WorkspaceRole
) {
  if (targetRole !== WorkspaceRole.OWNER) return;
  const ownerCount = await transaction.workspaceMember.count({
    where: { workspaceId, role: WorkspaceRole.OWNER },
  });
  if (ownerCount <= 1) {
    throw new WorkspaceServiceError("LAST_OWNER", 409);
  }
}

export async function updateWorkspaceMemberRole(input: {
  userId: string;
  workspaceId: string;
  memberUserId: string;
  role: WorkspaceRole;
}) {
  await requireSharedWorkspaceRole(
    input.userId,
    input.workspaceId,
    WorkspaceRole.OWNER
  );
  return serializableTransaction(async (transaction) => {
    await requireOwnerInsideTransaction(
      transaction,
      input.userId,
      input.workspaceId
    );
    const target = await transaction.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: input.workspaceId,
          userId: input.memberUserId,
        },
      },
      select: { role: true },
    });
    if (!target) {
      throw new WorkspaceServiceError("MEMBER_NOT_FOUND", 404);
    }
    if (
      target.role === WorkspaceRole.OWNER &&
      input.role !== WorkspaceRole.OWNER
    ) {
      await assertNotLastOwner(transaction, input.workspaceId, target.role);
    }
    return transaction.workspaceMember.update({
      where: {
        workspaceId_userId: {
          workspaceId: input.workspaceId,
          userId: input.memberUserId,
        },
      },
      data: { role: input.role },
      select: { userId: true, role: true },
    });
  });
}

export async function removeWorkspaceMember(input: {
  userId: string;
  workspaceId: string;
  memberUserId: string;
}) {
  await requireSharedWorkspaceRole(
    input.userId,
    input.workspaceId,
    WorkspaceRole.OWNER
  );
  return serializableTransaction(async (transaction) => {
    await requireOwnerInsideTransaction(
      transaction,
      input.userId,
      input.workspaceId
    );
    const target = await transaction.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: input.workspaceId,
          userId: input.memberUserId,
        },
      },
      select: { role: true },
    });
    if (!target) {
      throw new WorkspaceServiceError("MEMBER_NOT_FOUND", 404);
    }
    await assertNotLastOwner(transaction, input.workspaceId, target.role);
    await transaction.workspaceMember.delete({
      where: {
        workspaceId_userId: {
          workspaceId: input.workspaceId,
          userId: input.memberUserId,
        },
      },
    });
  });
}

export async function leaveWorkspace(userId: string, workspaceId: string) {
  const access = await requireSharedWorkspaceRole(
    userId,
    workspaceId,
    WorkspaceRole.VIEWER
  );
  return serializableTransaction(async (transaction) => {
    const membership = await transaction.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { role: true },
    });
    if (!membership) throw new WorkspaceServiceError("MEMBER_NOT_FOUND", 404);
    await assertNotLastOwner(transaction, workspaceId, membership.role);
    await transaction.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    return access.workspaceId;
  });
}
