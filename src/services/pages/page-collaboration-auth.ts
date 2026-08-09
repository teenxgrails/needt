import { verifyPageCollaborationToken } from "@/services/pages/page-collaboration-token";
import { PageAccessRole } from "@prisma/client";

import { type PageAccessActor, resolvePageAccess } from "@/lib/auth/page-auth";
import { resolveWorkspaceAccess } from "@/lib/auth/workspace-auth";

const DOCUMENT_PREFIX = "page:";

export type PageCollaborationContext = {
  resource: "page";
  actor: PageAccessActor;
  pageId: string;
  role: PageAccessRole;
};

export function pageIdFromCollaborationDocument(documentName: string) {
  return documentName.startsWith(DOCUMENT_PREFIX)
    ? documentName.slice(DOCUMENT_PREFIX.length)
    : null;
}

async function resolveCurrentPageCollaborationAccess(input: {
  userId: string;
  workspaceId: string;
  pageId: string;
}) {
  const workspace = await resolveWorkspaceAccess({
    userId: input.userId,
    requestedWorkspaceId: input.workspaceId,
  });
  const actor = { userId: input.userId, workspace };
  const access = await resolvePageAccess(actor, input.pageId);
  if (!access) throw new Error("Page collaboration access denied");
  return {
    resource: "page" as const,
    actor,
    pageId: input.pageId,
    role: access.role,
  };
}

export async function authenticatePageCollaboration(
  token: string,
  documentName: string
): Promise<PageCollaborationContext> {
  const claims = verifyPageCollaborationToken(token);
  const pageId = pageIdFromCollaborationDocument(documentName);
  if (!claims || !pageId || claims.pageId !== pageId) {
    throw new Error("Page collaboration token is invalid");
  }
  return resolveCurrentPageCollaborationAccess({
    userId: claims.sub,
    workspaceId: claims.workspaceId,
    pageId,
  });
}

export async function reauthorizePageCollaboration(
  context: PageCollaborationContext,
  documentName: string
) {
  const pageId = pageIdFromCollaborationDocument(documentName);
  const workspaceId = context.actor.workspace?.workspaceId;
  if (!pageId || pageId !== context.pageId || !workspaceId) {
    throw new Error("Page collaboration room is invalid");
  }
  return resolveCurrentPageCollaborationAccess({
    userId: context.actor.userId,
    workspaceId,
    pageId,
  });
}
