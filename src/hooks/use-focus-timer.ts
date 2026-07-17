"use client";

import { useEffect, useState } from "react";

import {
  effectiveElapsedSeconds,
  isSessionComplete,
  remainingSeconds,
} from "@/lib/focus-timer";

import { useFocusTimerStore } from "@/store/focusTimer";

/**
 * Renders the active focus session by recomputing time each second from the
 * server-truth fields. Because timing is derived from `startedAt` and the
 * persisted pause totals, the timer is correct immediately after a navigation
 * or full page reload — no client-held countdown to drift or reset.
 */
export function useFocusTimer() {
  const session = useFocusTimerStore((state) => state.session);
  const hydrated = useFocusTimerStore((state) => state.hydrated);
  const fetchActive = useFocusTimerStore((state) => state.fetchActive);
  const handleElapsed = useFocusTimerStore((state) => state.handleElapsed);

  const [now, setNow] = useState(() => Date.now());

  // Resume rendering an active session on first mount (survives reload).
  useEffect(() => {
    if (!hydrated) void fetchActive();
  }, [hydrated, fetchActive]);

  const isRunning = Boolean(session && !session.pausedAt && !session.endedAt);

  // Tick only while a session is actually running.
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  const timing = session
    ? {
        startedAt: session.startedAt,
        plannedMinutes: session.plannedMinutes,
        pausedTotalSeconds: session.pausedTotalSeconds,
        pausedAt: session.pausedAt,
      }
    : null;

  const remaining = timing ? remainingSeconds(timing, now) : null;
  const elapsed = timing ? effectiveElapsedSeconds(timing, now) : 0;
  const complete = timing ? isSessionComplete(timing, now) : false;

  // Fire completion exactly once when a countdown crosses zero.
  useEffect(() => {
    if (complete && isRunning) handleElapsed();
  }, [complete, isRunning, handleElapsed]);

  return {
    session,
    hydrated,
    isActive: Boolean(session),
    isRunning,
    isPaused: Boolean(session?.pausedAt),
    remainingSeconds: remaining,
    elapsedSeconds: elapsed,
  };
}
