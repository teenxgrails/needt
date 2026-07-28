"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  isCalendarNavigationTarget,
  moveCalendarDate,
} from "@/lib/calendar-navigation";

import type { CalendarView } from "@/types/calendar";

interface HorizontalNavigationOptions {
  currentDate: Date;
  view: CalendarView;
  enabled: boolean;
  onNavigate: (date: Date) => void;
}

const DRAG_THRESHOLD = 56;
const SETTLE_MS = 180;

export function useCalendarHorizontalNavigation({
  currentDate,
  view,
  enabled,
  onNavigate,
}: HorizontalNavigationOptions) {
  const rootRef = useRef<HTMLDivElement>(null);
  const spacePressed = useRef(false);
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const wheelDelta = useRef(0);
  const wheelLocked = useRef(false);
  const settleTimer = useRef<number | undefined>(undefined);
  const wheelTimer = useRef<number | undefined>(undefined);
  const [isGrabReady, setIsGrabReady] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [feedback, setFeedback] = useState<-1 | 1 | null>(null);

  const navigate = useCallback(
    (direction: -1 | 1) => {
      if (!enabled) return;
      onNavigate(moveCalendarDate(currentDate, view, direction));
      setFeedback(direction);
      if (settleTimer.current) window.clearTimeout(settleTimer.current);
      settleTimer.current = window.setTimeout(
        () => setFeedback(null),
        SETTLE_MS
      );
    },
    [currentDate, enabled, onNavigate, view]
  );

  useEffect(() => {
    if (!enabled) return;
    const root = rootRef.current;
    if (!root) return;

    const resetWheel = () => {
      wheelDelta.current = 0;
      wheelLocked.current = false;
    };

    const onWheel = (event: WheelEvent) => {
      if (isCalendarNavigationTarget(event.target)) return;
      const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
      if (!horizontal && !event.shiftKey) return;
      const delta = horizontal ? event.deltaX : event.deltaY;
      if (Math.abs(delta) < 1) return;
      event.preventDefault();
      if (wheelTimer.current) window.clearTimeout(wheelTimer.current);
      wheelTimer.current = window.setTimeout(resetWheel, SETTLE_MS);
      if (wheelLocked.current) return;
      wheelDelta.current += delta;
      if (Math.abs(wheelDelta.current) < 56) return;
      wheelLocked.current = true;
      navigate(wheelDelta.current > 0 ? 1 : -1);
    };

    root.addEventListener("wheel", onWheel, { passive: false });
    return () => root.removeEventListener("wheel", onWheel);
  }, [enabled, navigate]);

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isCalendarNavigationTarget(event.target)) return;
      if (event.altKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        event.preventDefault();
        navigate(event.key === "ArrowRight" ? 1 : -1);
        return;
      }
      if (event.code === "Space" && !event.repeat) {
        event.preventDefault();
        spacePressed.current = true;
        setIsGrabReady(true);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      spacePressed.current = false;
      drag.current = null;
      setIsGrabReady(false);
      setIsDragging(false);
    };
    const onBlur = () => {
      spacePressed.current = false;
      drag.current = null;
      setIsGrabReady(false);
      setIsDragging(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [enabled, navigate]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (
        !enabled ||
        !spacePressed.current ||
        event.button !== 0 ||
        isCalendarNavigationTarget(event.target)
      ) {
        return;
      }
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
      };
      setIsDragging(true);
    },
    [enabled]
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const active = drag.current;
      if (!active || active.pointerId !== event.pointerId || active.moved) return;
      const deltaX = event.clientX - active.startX;
      const deltaY = event.clientY - active.startY;
      if (
        Math.abs(deltaX) < DRAG_THRESHOLD ||
        Math.abs(deltaX) < Math.abs(deltaY)
      ) {
        return;
      }
      active.moved = true;
      navigate(deltaX < 0 ? 1 : -1);
    },
    [navigate]
  );

  const endDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    setIsDragging(false);
  }, []);

  useEffect(
    () => () => {
      if (settleTimer.current) window.clearTimeout(settleTimer.current);
      if (wheelTimer.current) window.clearTimeout(wheelTimer.current);
    },
    []
  );

  return {
    rootRef,
    isGrabReady,
    isDragging,
    feedback,
    pointerHandlers: {
      onPointerDownCapture: onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
}
