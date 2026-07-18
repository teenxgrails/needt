export const INITIAL_REALTIME_RECONNECT_DELAY_MS = 2_000;
export const MAX_REALTIME_RECONNECT_DELAY_MS = 60_000;

export function nextRealtimeReconnectDelay(currentDelayMs: number): number {
  return Math.min(currentDelayMs * 2, MAX_REALTIME_RECONNECT_DELAY_MS);
}
