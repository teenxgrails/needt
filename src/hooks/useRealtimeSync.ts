"use client";

import { useEffect } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { useAppSession } from "@/components/providers/app-session-context";

import { logger } from "@/lib/logger";
import {
  INITIAL_REALTIME_RECONNECT_DELAY_MS,
  nextRealtimeReconnectDelay,
} from "@/lib/realtime/reconnect";

import { useCalendarStore } from "@/store/calendar";
import { useTaskStore } from "@/store/task";

const LOG_SOURCE = "RealtimeSyncHook";

export function useRealtimeSync(): void {
  const queryClient = useQueryClient();
  const { status } = useAppSession();

  useEffect(() => {
    if (status !== "authenticated") return;

    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectDelayMs = INITIAL_REALTIME_RECONNECT_DELAY_MS;
    let stopped = false;

    const refreshCalendar = () => {
      void queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      void queryClient.invalidateQueries({ queryKey: ["calendar-feeds"] });
      void useCalendarStore.getState().refreshEvents();
      void useCalendarStore.getState().refreshFeeds();
    };

    const refreshTasks = () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void useTaskStore.getState().fetchTasks();
    };

    const connect = () => {
      if (stopped) return;
      eventSource = new EventSource("/api/stream");
      eventSource.addEventListener("calendar-updated", refreshCalendar);
      eventSource.addEventListener("tasks-updated", refreshTasks);
      eventSource.onopen = () => {
        reconnectDelayMs = INITIAL_REALTIME_RECONNECT_DELAY_MS;
      };
      eventSource.onerror = () => {
        eventSource?.close();
        eventSource = null;
        if (!stopped && !reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connect();
          }, reconnectDelayMs);
          reconnectDelayMs = nextRealtimeReconnectDelay(reconnectDelayMs);
        }
      };
    };

    try {
      connect();
    } catch (error) {
      void logger.warn(
        "Could not connect to realtime updates",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
    }

    return () => {
      stopped = true;
      eventSource?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [queryClient, status]);
}
