/** @jest-environment jsdom */
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

import { documentFromPageBlocks } from "@/components/pages/page-document";
import type { PageBlock } from "@/components/pages/page-types";

function percentile(values: number[], percentileValue: number) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * percentileValue) - 1)];
}

const blocks: PageBlock[] = Array.from({ length: 500 }, (_, index) => ({
  id: `block-${index}`,
  parentBlockId: null,
  type: "PARAGRAPH",
  content: { text: `Performance block ${index + 1}` },
  position: (index + 1) * 1024,
  createdBy: "HUMAN",
}));

describe("Page editor 500-block warm path", () => {
  it("keeps editor creation and input mutations within the performance budget", () => {
    const document = documentFromPageBlocks(blocks);
    const warmSamples: number[] = [];
    const keystrokeSamples: number[] = [];

    for (let sample = 0; sample < 5; sample += 1) {
      const warmStart = performance.now();
      const editor = new Editor({
        extensions: [StarterKit.configure({ undoRedo: false })],
        content: document,
      });
      warmSamples.push(performance.now() - warmStart);
      editor.commands.focus("end");
      for (let key = 0; key < 30; key += 1) {
        const keyStart = performance.now();
        editor.commands.insertContent("x");
        keystrokeSamples.push(performance.now() - keyStart);
      }
      editor.destroy();
    }

    const warmP95 = percentile(warmSamples, 0.95);
    const keystrokeP95 = percentile(keystrokeSamples, 0.95);
    process.stdout.write(
      `Page 500-block benchmark: warm p95 ${warmP95.toFixed(1)}ms, keystroke p95 ${keystrokeP95.toFixed(1)}ms\n`
    );

    expect(warmP95).toBeLessThan(1_500);
    expect(keystrokeP95).toBeLessThan(50);
  });
});
