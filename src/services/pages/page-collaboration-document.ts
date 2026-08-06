import { PageAuthor } from "@prisma/client";
import { prosemirrorJSONToYDoc, yDocToProsemirrorJSON } from "y-prosemirror";
import * as Y from "yjs";

import {
  documentFromPageBlocks,
  pageBlocksFromDocument,
} from "@/components/pages/page-document";
import type { PageBlock } from "@/components/pages/page-types";

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

export function collaborationDocumentToPageBlocks(document: Y.Doc) {
  return pageBlocksFromDocument(
    yDocToProsemirrorJSON(document, COLLABORATION_FIELD)
  ).map((block) => ({ ...block, createdBy: PageAuthor.HUMAN }));
}
