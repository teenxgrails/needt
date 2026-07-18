import {
  INITIAL_REALTIME_RECONNECT_DELAY_MS,
  MAX_REALTIME_RECONNECT_DELAY_MS,
  nextRealtimeReconnectDelay,
} from "@/lib/realtime/reconnect";

describe("realtime reconnect backoff", () => {
  it("backs off exponentially and caps retries at one minute", () => {
    expect(
      nextRealtimeReconnectDelay(INITIAL_REALTIME_RECONNECT_DELAY_MS)
    ).toBe(4_000);
    expect(nextRealtimeReconnectDelay(32_000)).toBe(
      MAX_REALTIME_RECONNECT_DELAY_MS
    );
    expect(
      nextRealtimeReconnectDelay(MAX_REALTIME_RECONNECT_DELAY_MS)
    ).toBe(MAX_REALTIME_RECONNECT_DELAY_MS);
  });
});
