const PAGE_COLLABORATION_PROTOCOL = "v2";
const PAGE_DOCUMENT_PREFIX = `page:${PAGE_COLLABORATION_PROTOCOL}:`;
const PAGE_DRAFT_PREFIX = `needt-page-draft:${PAGE_COLLABORATION_PROTOCOL}:`;

export function pageCollaborationDocumentName(pageId: string) {
  return `${PAGE_DOCUMENT_PREFIX}${pageId}`;
}

export function pageIdFromCollaborationDocument(documentName: string) {
  if (!documentName.startsWith(PAGE_DOCUMENT_PREFIX)) return null;
  const pageId = documentName.slice(PAGE_DOCUMENT_PREFIX.length);
  return pageId || null;
}

export function pageCollaborationDraftKey(pageId: string) {
  return `${PAGE_DRAFT_PREFIX}${pageId}`;
}

export function legacyPageCollaborationDraftKey(pageId: string) {
  return `needt-page-draft:${pageId}`;
}
