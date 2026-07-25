import { type Editor, Extension } from "@tiptap/core";

import { randomId } from "@/lib/uuid";

const IDENTITY_BLOCKS = [
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "taskList",
  "blockquote",
  "codeBlock",
  "horizontalRule",
  "image",
  "taskReference",
  "taskGroupReference",
];

export const BlockIdentity = Extension.create({
  name: "blockIdentity",
  addGlobalAttributes() {
    return [
      {
        types: IDENTITY_BLOCKS,
        attributes: {
          blockId: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-block-id"),
            renderHTML: (attributes) =>
              attributes.blockId
                ? { "data-block-id": String(attributes.blockId) }
                : {},
          },
        },
      },
    ];
  },
});

export function ensureBlockIds(editor: Editor) {
  let changed = false;
  const transaction = editor.state.tr;
  editor.state.doc.forEach((node, offset) => {
    if (!node.type.spec.attrs?.blockId || node.attrs.blockId) return;
    transaction.setNodeMarkup(offset, undefined, {
      ...node.attrs,
      blockId: randomId(),
    });
    changed = true;
  });
  if (changed) editor.view.dispatch(transaction);
  return changed;
}
