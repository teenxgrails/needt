import { MoodboardAccessRole } from "@prisma/client";

import {
  type MoodboardAccessActor,
  resolveMoodboardAccess,
} from "@/lib/auth/moodboard-auth";
import { prisma } from "@/lib/prisma";

export class MoodboardAccessServiceError extends Error {
  constructor(
    public readonly code:
      | "MOODBOARD_NOT_FOUND"
      | "MOODBOARD_FULL_ACCESS_REQUIRED"
      | "WORKSPACE_MEMBER_REQUIRED"
      | "MOODBOARD_CREATOR_ACCESS_FIXED",
    public readonly status: 403 | 404
  ) {
    super(code);
    this.name = "MoodboardAccessServiceError";
  }
}

async function requireFullAccess(
  actor: MoodboardAccessActor,
  moodboardId: string
) {
  const access = await resolveMoodboardAccess(
    actor,
    moodboardId,
    MoodboardAccessRole.FULL_ACCESS
  );
  if (!access) {
    throw new MoodboardAccessServiceError(
      "MOODBOARD_FULL_ACCESS_REQUIRED",
      403
    );
  }
  if (!actor.workspace) {
    throw new MoodboardAccessServiceError("MOODBOARD_NOT_FOUND", 404);
  }
  const moodboard = await prisma.moodboard.findFirst({
    where: {
      id: moodboardId,
      workspaceId: actor.workspace.workspaceId,
      archivedAt: null,
    },
    select: { id: true, createdById: true, workspaceId: true },
  });
  if (!moodboard) {
    throw new MoodboardAccessServiceError("MOODBOARD_NOT_FOUND", 404);
  }
  return moodboard;
}

export async function listMoodboardAccessGrants(
  actor: MoodboardAccessActor,
  moodboardId: string
) {
  const moodboard = await requireFullAccess(actor, moodboardId);
  const grants = await prisma.moodboardAccessGrant.findMany({
    where: { moodboardId },
    select: {
      userId: true,
      role: true,
      user: { select: { name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return { creatorId: moodboard.createdById, grants };
}

export async function setMoodboardAccessGrant(
  actor: MoodboardAccessActor,
  moodboardId: string,
  userId: string,
  role: MoodboardAccessRole
) {
  const moodboard = await requireFullAccess(actor, moodboardId);
  if (moodboard.createdById === userId) {
    throw new MoodboardAccessServiceError(
      "MOODBOARD_CREATOR_ACCESS_FIXED",
      403
    );
  }
  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId: moodboard.workspaceId, userId },
    },
    select: { userId: true },
  });
  if (!member) {
    throw new MoodboardAccessServiceError("WORKSPACE_MEMBER_REQUIRED", 403);
  }
  return prisma.moodboardAccessGrant.upsert({
    where: { moodboardId_userId: { moodboardId, userId } },
    create: { moodboardId, userId, role, grantedById: actor.userId },
    update: { role, grantedById: actor.userId },
    select: {
      userId: true,
      role: true,
      user: { select: { name: true, email: true, image: true } },
    },
  });
}

export async function removeMoodboardAccessGrant(
  actor: MoodboardAccessActor,
  moodboardId: string,
  userId: string
) {
  const moodboard = await requireFullAccess(actor, moodboardId);
  if (moodboard.createdById === userId) {
    throw new MoodboardAccessServiceError(
      "MOODBOARD_CREATOR_ACCESS_FIXED",
      403
    );
  }
  await prisma.moodboardAccessGrant.deleteMany({
    where: { moodboardId, userId },
  });
}
