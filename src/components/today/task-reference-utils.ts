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
