import { MoodboardAccessRole, Prisma } from "@prisma/client";

import {
  type MoodboardAccessActor,
  resolveMoodboardAccess,
} from "@/lib/auth/moodboard-auth";
import { newDate } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";

export type MoodboardActor = MoodboardAccessActor;

function scope(actor: MoodboardActor) {
  return actor.workspace ? { workspaceId: actor.workspace.workspaceId } : null;
}

export async function listMoodboards(actor: MoodboardActor) {
  const workspace = scope(actor);
  if (!workspace) return [];
  return prisma.moodboard.findMany({
    where: { ...workspace, archivedAt: null },
    select: { id: true, title: true, createdById: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createMoodboard(
  actor: MoodboardActor,
  input: { title?: string }
) {
  const workspace = scope(actor);
  if (!workspace) return null;
  return prisma.moodboard.create({
    data: {
      ...workspace,
      createdById: actor.userId,
      title: input.title?.trim().slice(0, 240) || "Untitled Moodboard",
    },
    select: { id: true, title: true, createdById: true, updatedAt: true },
  });
}

export async function getMoodboard(actor: MoodboardActor, moodboardId: string) {
  const access = await resolveMoodboardAccess(actor, moodboardId);
  if (!access) return null;
  const moodboard = await prisma.moodboard.findFirst({
    where: { id: moodboardId, ...scope(actor), archivedAt: null },
    select: { id: true, title: true, createdById: true, updatedAt: true },
  });
  return moodboard ? { ...moodboard, accessRole: access.role } : null;
}

export async function updateMoodboard(
  actor: MoodboardActor,
  moodboardId: string,
  input: { title?: string; archived?: boolean }
) {
  const requiredRole = input.archived
    ? MoodboardAccessRole.FULL_ACCESS
    : MoodboardAccessRole.EDITOR;
  if (!(await resolveMoodboardAccess(actor, moodboardId, requiredRole))) {
    return null;
  }
  const workspace = scope(actor);
  if (!workspace) return null;
  const data: Prisma.MoodboardUpdateManyMutationInput = {
    ...(typeof input.title === "string" && {
      title: input.title.trim().slice(0, 240) || "Untitled Moodboard",
    }),
    ...(typeof input.archived === "boolean" && {
      archivedAt: input.archived ? newDate() : null,
    }),
  };
  const updated = await prisma.moodboard.updateMany({
    where: { id: moodboardId, ...workspace },
    data,
  });
  if (updated.count === 0) return null;
  return prisma.moodboard.findFirst({
    where: { id: moodboardId, ...workspace },
    select: { id: true, title: true, createdById: true, updatedAt: true },
  });
}

export async function listMoodboardSnapshots(
  actor: MoodboardActor,
  moodboardId: string
) {
  if (
    !(await resolveMoodboardAccess(
      actor,
      moodboardId,
      MoodboardAccessRole.FULL_ACCESS
    ))
  ) {
    return null;
  }
  return prisma.moodboardSnapshot.findMany({
    where: { moodboardId },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 24,
  });
}

export async function getMoodboardSnapshot(
  actor: MoodboardActor,
  moodboardId: string,
  snapshotId: string
) {
  if (
    !(await resolveMoodboardAccess(
      actor,
      moodboardId,
      MoodboardAccessRole.FULL_ACCESS
    ))
  ) {
    return null;
  }
  return prisma.moodboardSnapshot.findFirst({
    where: { id: snapshotId, moodboardId },
    select: { id: true, scene: true, createdAt: true },
  });
}
