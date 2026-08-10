import type { JSONContent } from "@tiptap/core";

import { PageAutosave } from "@/components/pages/page-autosave";

const firstDraft: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "One" }] }],
};
const latestDraft: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "Two" }] }],
};

describe("PageAutosave", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("coalesces rapid edits and only persists the latest document", async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const removeDraft = jest.fn();
    const autosave = new PageAutosave({
      delayMs: 650,
      isOnline: () => true,
      onStateChange: jest.fn(),
      persistDraft: jest.fn(),
      removeDraft,
      save,
    });

    autosave.schedule(firstDraft);
    autosave.schedule(latestDraft);
    await jest.advanceTimersByTimeAsync(650);

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(latestDraft);
    expect(removeDraft).toHaveBeenCalledTimes(1);
  });

  it("retains an offline draft and retries it when the connection returns", async () => {
    let online = false;
    const save = jest.fn().mockResolvedValue(undefined);
    const states: string[] = [];
    const autosave = new PageAutosave({
      delayMs: 650,
      isOnline: () => online,
      onStateChange: (state) => states.push(state),
      persistDraft: jest.fn(),
      removeDraft: jest.fn(),
      save,
    });

    autosave.schedule(latestDraft);
    await jest.advanceTimersByTimeAsync(650);
    expect(states.at(-1)).toBe("offline");
    expect(save).not.toHaveBeenCalled();

    online = true;
    autosave.retryWhenOnline();
    await Promise.resolve();

    expect(save).toHaveBeenCalledWith(latestDraft);
    expect(states.at(-1)).toBe("saved");
  });
});
