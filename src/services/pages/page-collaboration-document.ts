import { PageAuthor } from "@prisma/client";
import {
  prosemirrorJSONToYDoc,
  prosemirrorJSONToYXmlFragment,
  yDocToProsemirrorJSON,
} from "y-prosemirror";

import {
  documentFromPageBlocks,
  pageBlocksFromDocument,
} from "@/components/pages/page-document";
import type { PageBlock } from "@/components/pages/page-types";

import { Yjs as Y } from "@/lib/collaboration/yjs";
import { pageEditorSchema } from "@/lib/pages/page-editor-schema";

const COLLABORATION_FIELD = "default";

export function pageBlocksToCollaborationState(blocks: PageBlock[]) {
  const document =
    documentFromPageBlocks(blocks) ?? ({ type: "doc", content: [] } as const);
  const yDocument = prosemirrorJSONToYDoc(
    pageEditorSchema,
    document,
    COLLABORATION_FIELD
  );
  return Y.encodeStateAsUpdate(yDocument);
}

export function replacePageCollaborationDocumentBlocks(
  yDocument: Y.Doc,
  blocks: PageBlock[]
) {
  const document =
    documentFromPageBlocks(blocks) ?? ({ type: "doc", content: [] } as const);
  prosemirrorJSONToYXmlFragment(
    pageEditorSchema,
    document,
    yDocument.getXmlFragment(COLLABORATION_FIELD)
  );
}

export function collaborationDocumentToPageBlocks(document: Y.Doc) {
  return pageBlocksFromDocument(
    yDocToProsemirrorJSON(document, COLLABORATION_FIELD)
  ).map((block) => ({ ...block, createdBy: PageAuthor.HUMAN }));
}
