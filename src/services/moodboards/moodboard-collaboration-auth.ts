import { verifyMoodboardCollaborationToken } from "@/services/moodboards/moodboard-collaboration-token";
import { MoodboardAccessRole } from "@prisma/client";

import {
  type MoodboardAccessActor,
  resolveMoodboardAccess,
} from "@/lib/auth/moodboard-auth";
import { resolveWorkspaceAccess } from "@/lib/auth/workspace-auth";

const DOCUMENT_PREFIX = "moodboard:";

export type MoodboardCollaborationContext = {
  resource: "moodboard";
  actor: MoodboardAccessActor;
  moodboardId: string;
  role: MoodboardAccessRole;
};

export function moodboardIdFromCollaborationDocument(documentName: string) {
  return documentName.startsWith(DOCUMENT_PREFIX)
    ? documentName.slice(DOCUMENT_PREFIX.length)
    : null;
}

async function resolveCurrentMoodboardCollaborationAccess(input: {
  userId: string;
  workspaceId: string;
  moodboardId: string;
}) {
  const workspace = await resolveWorkspaceAccess({
    userId: input.userId,
    requestedWorkspaceId: input.workspaceId,
  });
  const actor = { userId: input.userId, workspace };
  const access = await resolveMoodboardAccess(actor, input.moodboardId);
  if (!access) throw new Error("Moodboard collaboration access denied");
  return {
    resource: "moodboard" as const,
    actor,
    moodboardId: input.moodboardId,
    role: access.role,
  };
}

export async function authenticateMoodboardCollaboration(
  token: string,
  documentName: string
): Promise<MoodboardCollaborationContext> {
  const claims = verifyMoodboardCollaborationToken(token);
  const moodboardId = moodboardIdFromCollaborationDocument(documentName);
  if (!claims || !moodboardId || claims.moodboardId !== moodboardId) {
    throw new Error("Moodboard collaboration token is invalid");
  }
  return resolveCurrentMoodboardCollaborationAccess({
    userId: claims.sub,
    workspaceId: claims.workspaceId,
    moodboardId,
  });
}

export async function reauthorizeMoodboardCollaboration(
  context: MoodboardCollaborationContext,
  documentName: string
) {
  const moodboardId = moodboardIdFromCollaborationDocument(documentName);
  const workspaceId = context.actor.workspace?.workspaceId;
  if (!moodboardId || moodboardId !== context.moodboardId || !workspaceId) {
    throw new Error("Moodboard collaboration room is invalid");
  }
  return resolveCurrentMoodboardCollaborationAccess({
    userId: context.actor.userId,
    workspaceId,
    moodboardId,
  });
}
