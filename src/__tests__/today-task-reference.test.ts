import { Node } from "@tiptap/core";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import {
  collapseDuplicateTaskReferences,
  collectTaskReferenceIds,
} from "@/components/today/task-reference-utils";

const TaskReferenceNode = Node.create({
  name: "taskReference",
  group: "block",
  atom: true,
  addAttributes() {
    return { taskId: { default: null } };
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", { ...HTMLAttributes, "data-type": "taskReference" }];
  },
});

function editorWithNodes(
  nodes: Array<{ type: { name: string }; attrs: object }>
) {
  return {
    state: {
      doc: {
        descendants: (
          callback: (node: { type: { name: string }; attrs: object }) => void
        ) => nodes.forEach(callback),
      },
    },
  };
}

describe("Today task references", () => {
  it("reports canonical task ids and ignores other document nodes", () => {
    const editor = editorWithNodes([
      { type: { name: "paragraph" }, attrs: {} },
      {
        type: { name: "taskReference" },
        attrs: { taskId: "task_123" },
      },
    ]);

    expect([...collectTaskReferenceIds(editor)]).toEqual(["task_123"]);
  });

  it("deduplicates task ids and ignores empty references", () => {
    const editor = editorWithNodes([
      {
        type: { name: "taskReference" },
        attrs: { taskId: "task_123" },
      },
      {
        type: { name: "taskReference" },
        attrs: { taskId: "task_123" },
      },
      { type: { name: "taskReference" }, attrs: { taskId: "" } },
    ]);

    expect([...collectTaskReferenceIds(editor)]).toEqual(["task_123"]);
  });

  it("collapses duplicate reference blocks while preserving the first", () => {
    const editor = new Editor({
      extensions: [StarterKit, TaskReferenceNode],
      content: {
        type: "doc",
        content: [
          { type: "taskReference", attrs: { taskId: "task_123" } },
          {
            type: "paragraph",
            content: [{ type: "text", text: "Keep this note" }],
          },
          { type: "taskReference", attrs: { taskId: "task_123" } },
        ],
      },
    });

    expect(collapseDuplicateTaskReferences(editor)).toBe(true);
    expect([...collectTaskReferenceIds(editor)]).toEqual(["task_123"]);
    expect(editor.getText()).toContain("Keep this note");
    expect(
      editor.getJSON().content?.filter((node) => node.type === "taskReference")
    ).toHaveLength(1);
    editor.destroy();
  });
});
