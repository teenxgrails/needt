export type RealtimeEventType =
  | "calendar-updated"
  | "tasks-updated"
  | "schedule-run-updated";

export interface RealtimeEvent {
  type: RealtimeEventType;
  occurredAt: string;
  feedId?: string;
  runId?: string;
  status?: string;
}

export function getUserRealtimeChannel(userId: string): string {
  return `needt:realtime:user:${userId}`;
}
