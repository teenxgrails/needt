import { DailyAgendaAutosave } from "@/components/today/daily-agenda-autosave";

describe("DailyAgendaAutosave", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("coalesces edits while keeping their date key", async () => {
    let activeDate = "2026-08-08";
    const save = jest.fn().mockResolvedValue(undefined);
    const autosave = new DailyAgendaAutosave({
      delayMs: 550,
      getActiveDate: () => activeDate,
      getDocumentFormatVersion: () => 2,
      onStateChange: jest.fn(),
      persistDraft: jest.fn(),
      removeDraft: jest.fn(),
      save,
    });

    autosave.schedule(activeDate, "first");
    autosave.schedule(activeDate, "latest");
    activeDate = "2026-08-09";
    await autosave.flush("2026-08-08");

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({
      date: "2026-08-08",
      content: "latest",
      documentFormatVersion: 2,
    });
  });

  it("does not clear a newer draft when an older request finishes", async () => {
    let resolveSave: (() => void) | undefined;
    const removeDraft = jest.fn();
    const persistDraft = jest.fn();
    const save = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        })
    );
    const autosave = new DailyAgendaAutosave({
      getActiveDate: () => "2026-08-08",
      getDocumentFormatVersion: () => 1,
      onStateChange: jest.fn(),
      persistDraft,
      removeDraft,
      save,
    });

    autosave.schedule("2026-08-08", "older");
    const firstFlush = autosave.flush();
    await Promise.resolve();
    await Promise.resolve();
    expect(resolveSave).toBeDefined();
    autosave.schedule("2026-08-08", "newer");
    resolveSave?.();
    await firstFlush;

    expect(removeDraft).not.toHaveBeenCalled();
    expect(persistDraft).toHaveBeenLastCalledWith("2026-08-08", "newer");
  });

  it("restores a failed save for explicit retry", async () => {
    const states: string[] = [];
    const save = jest
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(undefined);
    const autosave = new DailyAgendaAutosave({
      getActiveDate: () => "2026-08-08",
      getDocumentFormatVersion: () => 1,
      onStateChange: (state) => states.push(state),
      persistDraft: jest.fn(),
      removeDraft: jest.fn(),
      save,
    });

    autosave.schedule("2026-08-08", "recover me");
    await autosave.flush();
    expect(states.at(-1)).toBe("error");

    await autosave.flush("2026-08-08");
    expect(save).toHaveBeenCalledTimes(2);
    expect(states.at(-1)).toBe("saved");
  });
});
