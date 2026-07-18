/**
 * Pure focus-timer math. The server is the source of truth for a focus
 * session; the client renders remaining time computed from these functions so
 * the timer survives navigation and full page reloads.
 *
 * Everything here is a pure function of the persisted session fields plus a
 * caller-supplied `now`, so it can be unit-tested without a clock or a DB and
 * shared between the API layer and the React rendering hook.
 */

import { newDate } from "@/lib/date-utils";

export interface FocusTiming {
  /** When the session started (server truth). */
  startedAt: Date | string;
  /**
   * Planned length in minutes for a countdown session (Pomodoro / Deep Focus),
   * or null for a free/flow session that counts up with no fixed end.
   */
  plannedMinutes: number | null;
  /** Accumulated seconds from previously completed pause spans. */
  pausedTotalSeconds: number;
  /** When the current pause began, or null when the session is running. */
  pausedAt: Date | string | null;
}

function ms(value: Date | string): number {
  return value instanceof Date ? value.getTime() : newDate(value).getTime();
}

/**
 * Seconds actually spent focused: wall time since start, minus every second
 * spent paused (both completed pause spans and any pause currently in
 * progress). Never negative.
 */
export function effectiveElapsedSeconds(
  timing: FocusTiming,
  now: Date | number
): number {
  const nowMs = typeof now === "number" ? now : now.getTime();
  const sinceStart = (nowMs - ms(timing.startedAt)) / 1000;
  const currentPause = timing.pausedAt
    ? Math.max(0, (nowMs - ms(timing.pausedAt)) / 1000)
    : 0;
  const elapsed = sinceStart - timing.pausedTotalSeconds - currentPause;
  return Math.max(0, Math.floor(elapsed));
}

/**
 * Seconds left on a countdown session, clamped at zero. Returns null for a
 * free/flow session (no fixed end) — callers render elapsed time for those.
 */
export function remainingSeconds(
  timing: FocusTiming,
  now: Date | number
): number | null {
  if (timing.plannedMinutes == null) return null;
  const total = timing.plannedMinutes * 60;
  return Math.max(0, total - effectiveElapsedSeconds(timing, now));
}

/** True once a countdown session has run out. Always false for free sessions. */
export function isSessionComplete(
  timing: FocusTiming,
  now: Date | number
): boolean {
  const remaining = remainingSeconds(timing, now);
  return remaining !== null && remaining <= 0;
}

/**
 * Projected wall-clock time the countdown reaches zero, given the current
 * running/paused state. Null for free sessions. While paused this drifts
 * forward with `now`, which is correct: a pause pushes the end out.
 */
export function projectedEndsAt(
  timing: FocusTiming,
  now: Date | number
): Date | null {
  const remaining = remainingSeconds(timing, now);
  if (remaining === null) return null;
  const nowMs = typeof now === "number" ? now : now.getTime();
  return newDate(nowMs + remaining * 1000);
}

/** Whole minutes focused, for persisting onto the session and the task. */
export function focusedMinutes(
  timing: FocusTiming,
  now: Date | number
): number {
  return Math.round(effectiveElapsedSeconds(timing, now) / 60);
}

/** mm:ss for display. Clamps negatives to 00:00. */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}
