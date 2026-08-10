import {
  blockTypeForNode,
  documentFromPageBlocks,
  pageBlocksFromDocument,
} from "@/components/pages/page-document";

describe("page document contract", () => {
  it("hydrates and serializes canonical blocks without changing stable IDs", () => {
    const document = documentFromPageBlocks([
      {
        id: "stable-paragraph",
        parentBlockId: null,
        type: "PARAGRAPH",
        content: {
          json: {
            type: "paragraph",
            content: [{ type: "text", text: "First block" }],
          },
        },
        position: 1024,
        createdBy: "HUMAN",
      },
      {
        id: "stable-heading",
        parentBlockId: null,
        type: "HEADING_2",
        content: {
          json: {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "Section" }],
          },
        },
        position: 2048,
        createdBy: "HUMAN",
      },
    ]);

    expect(document?.content?.map((node) => node.attrs?.blockId)).toEqual([
      "stable-paragraph",
      "stable-heading",
    ]);
    expect(pageBlocksFromDocument(document!)).toMatchObject([
      { id: "stable-paragraph", type: "PARAGRAPH", position: 1024 },
      { id: "stable-heading", type: "HEADING_2", position: 2048 },
    ]);
  });

  it("maps list, checklist and special nodes to canonical block types", () => {
    expect(blockTypeForNode({ type: "bulletList" })).toBe("BULLETED_LIST");
    expect(blockTypeForNode({ type: "taskList" })).toBe("CHECKLIST");
    expect(
      blockTypeForNode({
        type: "needtPageBlock",
        attrs: { kind: "BOOKMARK" },
      })
    ).toBe("BOOKMARK");
    expect(
      blockTypeForNode({
        type: "needtPageBlock",
        attrs: { kind: "TASK_REFERENCE" },
      })
    ).toBe("LINK");
  });

  it("repairs duplicate and missing block IDs before persistence", () => {
    const blocks = pageBlocksFromDocument({
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { blockId: "duplicate-id" },
          content: [{ type: "text", text: "First" }],
        },
        {
          type: "paragraph",
          attrs: { blockId: "duplicate-id" },
          content: [{ type: "text", text: "Second" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Third" }],
        },
      ],
    });

    const ids = blocks.map((block) => block.id);
    expect(ids[0]).toBe("duplicate-id");
    expect(new Set(ids).size).toBe(3);
    expect(ids.every(Boolean)).toBe(true);
    expect(
      blocks.map(
        (block) =>
          (block.content.json as { attrs?: { blockId?: string } }).attrs
            ?.blockId
      )
    ).toEqual(ids);
  });
});
