import { verifyPageCollaborationToken } from "@/services/pages/page-collaboration-token";
import { PageAccessRole } from "@prisma/client";

import { type PageAccessActor, resolvePageAccess } from "@/lib/auth/page-auth";
import { resolveWorkspaceAccess } from "@/lib/auth/workspace-auth";

const DOCUMENT_PREFIX = "page:";

export type PageCollaborationContext = {
  actor: PageAccessActor;
  pageId: string;
  role: PageAccessRole;
};

export function pageIdFromCollaborationDocument(documentName: string) {
  return documentName.startsWith(DOCUMENT_PREFIX)
    ? documentName.slice(DOCUMENT_PREFIX.length)
    : null;
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
  const workspace = await resolveWorkspaceAccess({
    userId: claims.sub,
    requestedWorkspaceId: claims.workspaceId,
  });
  const actor = { userId: claims.sub, workspace };
  const access = await resolvePageAccess(actor, pageId);
  if (!access) throw new Error("Page collaboration access denied");
  return { actor, pageId, role: access.role };
}
