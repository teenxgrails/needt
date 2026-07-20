"use client";

import { useCallback, useEffect, useState } from "react";

import { logger } from "@/lib/logger";

import type { BoardColumn } from "@/store/boards";

import { Task } from "@/types/task";

const LOG_SOURCE = "useBoardDetail";

export interface BoardDetail {
  id: string;
  name: string;
  icon: string | null;
  groupBy: string;
  columns: BoardColumn[];
  tasks: Task[];
}

export interface BoardCalendarEvent {
  id: string;
  title: string;
  start: Date | string;
  end: Date | string;
  allDay: boolean;
  feed?: {
    name: string;
    color: string | null;
  };
}

/**
 * Loads one board's columns and cards and exposes the card/column mutations the
 * canvas needs. Server is the source of truth for ordering (fractional
 * positions); after a move we re-fetch so the derived order stays consistent.
 */
export function useBoardDetail(boardId: string) {
  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<BoardCalendarEvent[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/boards/${boardId}`);
      if (!response.ok) throw new Error(`status ${response.status}`);
      const data = (await response.json()) as { board: BoardDetail };
      setBoard(data.board);
      setError(false);
    } catch (err) {
      logger.error(
        "Failed to load board",
        { boardId, error: err instanceof Error ? err.message : String(err) },
        LOG_SOURCE
      );
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    const loadCalendarEvents = async () => {
      try {
        const response = await fetch("/api/events");
        if (cancelled) return;
        if (!response.ok) {
          setCalendarEvents([]);
          return;
        }
        const events = (await response.json()) as BoardCalendarEvent[];
        if (!cancelled) setCalendarEvents(events);
      } catch {
        if (!cancelled) setCalendarEvents([]);
      }
    };
    void loadCalendarEvents();
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  const moveCard = useCallback(
    async (taskId: string, columnId: string, toIndex: number) => {
      await fetch(`/api/boards/${boardId}/cards`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, columnId, toIndex }),
      });
      await refresh();
    },
    [boardId, refresh]
  );

  const addCard = useCallback(
    async (columnId: string, title: string) => {
      await fetch(`/api/boards/${boardId}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnId, title }),
      });
      await refresh();
    },
    [boardId, refresh]
  );

  return {
    board,
    calendarEvents,
    loading,
    error,
    refresh,
    moveCard,
    addCard,
  };
}
