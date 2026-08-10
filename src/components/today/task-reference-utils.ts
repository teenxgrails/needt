import type { Editor } from "@tiptap/react";

export function collectTaskReferenceIds(editor: {
  state: {
    doc: {
      descendants: (
        callback: (node: { type: { name: string }; attrs: object }) => void
      ) => void;
    };
  };
}) {
  const ids = new Set<string>();
  editor.state.doc.descendants((node) => {
    if (node.type.name !== "taskReference") return;
    const taskId = String((node.attrs as { taskId?: string }).taskId ?? "");
    if (taskId) ids.add(taskId);
  });
  return ids;
}

export function collapseDuplicateTaskReferences(editor: Editor) {
  const seen = new Set<string>();
  const duplicates: Array<{ from: number; to: number }> = [];
  editor.state.doc.descendants((node, position) => {
    if (node.type.name !== "taskReference") return;
    const taskId = String(node.attrs.taskId ?? "");
    if (!taskId || !seen.has(taskId)) {
      if (taskId) seen.add(taskId);
      return;
    }
    duplicates.push({ from: position, to: position + node.nodeSize });
  });
  if (duplicates.length === 0) return false;

  const transaction = editor.state.tr;
  for (const duplicate of duplicates.reverse()) {
    transaction.delete(duplicate.from, duplicate.to);
  }
  editor.view.dispatch(transaction);
  return true;
}
