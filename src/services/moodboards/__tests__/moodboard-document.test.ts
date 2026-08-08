import * as Y from "yjs";

import {
  readMoodboardScene,
  replaceMoodboardScene,
  writeMoodboardScene,
} from "../moodboard-document";

describe("Moodboard document", () => {
  it("merges concurrent changes to different canvas elements", () => {
    const seed = new Y.Doc();
    writeMoodboardScene(seed, { elements: [], appState: {}, files: {} });
    const initialState = Y.encodeStateAsUpdate(seed);
    const first = new Y.Doc();
    const second = new Y.Doc();
    Y.applyUpdate(first, initialState);
    Y.applyUpdate(second, initialState);

    writeMoodboardScene(first, {
      elements: [{ id: "first", type: "rectangle", index: "a" }],
      appState: {},
      files: {},
    });
    writeMoodboardScene(second, {
      elements: [{ id: "second", type: "rectangle", index: "b" }],
      appState: {},
      files: {},
    });
    Y.applyUpdate(first, Y.encodeStateAsUpdate(second));
    Y.applyUpdate(second, Y.encodeStateAsUpdate(first));

    expect(
      readMoodboardScene(first).elements.map((element) => element.id)
    ).toEqual(["first", "second"]);
    expect(readMoodboardScene(second)).toEqual(readMoodboardScene(first));
    seed.destroy();
    first.destroy();
    second.destroy();
  });

  it("replaces the complete scene when restoring a snapshot", () => {
    const document = new Y.Doc();
    writeMoodboardScene(document, {
      elements: [{ id: "new", type: "rectangle" }],
      appState: {},
      files: { new: { id: "new" } },
    });

    replaceMoodboardScene(document, {
      elements: [{ id: "saved", type: "ellipse" }],
      appState: { viewBackgroundColor: "#f4f4f5" },
      files: { saved: { id: "saved" } },
    });

    expect(readMoodboardScene(document)).toEqual({
      elements: [{ id: "saved", type: "ellipse" }],
      appState: { viewBackgroundColor: "#f4f4f5", gridSize: null },
      files: { saved: { id: "saved" } },
    });
    document.destroy();
  });
});
