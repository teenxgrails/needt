const storage = new Map<string, string>();

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  },
});

describe("focus timer store", () => {
  beforeEach(() => {
    storage.clear();
    jest.resetModules();
  });

  it("keeps the completion prompt after an elapsed session is closed", async () => {
    const session = {
      id: "focus-1",
      taskId: "task-1",
      mode: "POMODORO" as const,
      plannedMinutes: 25,
      pausedTotalSeconds: 0,
      pausedAt: null,
      startedAt: "2026-07-18T10:00:00.000Z",
      endedAt: null,
    };
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ session: null }),
    });
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: fetchMock,
    });

    const { useFocusTimerStore } = await import("@/store/focusTimer");
    useFocusTimerStore.setState({
      session,
      hydrated: true,
      pendingCompletion: null,
    });

    useFocusTimerStore.getState().handleElapsed();
    expect(useFocusTimerStore.getState().pendingCompletion).toEqual(session);

    await new Promise((resolve) => setImmediate(resolve));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/focus/session",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          action: "stop",
          sessionId: "focus-1",
          completed: true,
          markTaskDone: false,
        }),
      })
    );
    expect(useFocusTimerStore.getState().session).toBeNull();
    expect(useFocusTimerStore.getState().pendingCompletion).toEqual(session);
  });
});
