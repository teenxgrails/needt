import { collectTaskReferenceIds } from "@/components/today/task-reference-utils";

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
});
