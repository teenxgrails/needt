import type { CalendarApi } from "@fullcalendar/core";

import { newDate } from "@/lib/date-utils";

const CURRENT_LINE_SELECTOR = ".fc-timegrid-now-indicator-line";
const SCROLLER_SELECTOR = ".fc-scroller";

function findVerticalScroller(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>(SCROLLER_SELECTOR)).find(
    (element) =>
      element.scrollHeight > element.clientHeight &&
      Boolean(element.querySelector(".fc-timegrid-body"))
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function computeCalendarScrollTop({
  markerTop,
  viewportHeight,
  scrollHeight,
  targetRatio = 0.3,
}: {
  markerTop: number;
  viewportHeight: number;
  scrollHeight: number;
  targetRatio?: number;
}) {
  return clamp(
    markerTop - viewportHeight * targetRatio,
    0,
    Math.max(0, scrollHeight - viewportHeight)
  );
}

export const CalendarScrollPolicy = {
  targetRatio: 0.3,
  minAcceptedRatio: 0.25,
  maxAcceptedRatio: 0.35,
  maxLayoutFrames: 12,

  position(
    root: HTMLElement,
    calendar: CalendarApi,
    workdayStart: string,
    allowCurrentTimeFallback = false
  ): boolean {
    const scroller = findVerticalScroller(root);
    if (!scroller) return false;

    const marker = root.querySelector<HTMLElement>(CURRENT_LINE_SELECTOR);
    if (marker) {
      const markerTop =
        marker.getBoundingClientRect().top -
        scroller.getBoundingClientRect().top +
        scroller.scrollTop;
      scroller.scrollTop = computeCalendarScrollTop({
        markerTop,
        viewportHeight: scroller.clientHeight,
        scrollHeight: scroller.scrollHeight,
        targetRatio: this.targetRatio,
      });
      scroller.dataset.needtScrollAnchor = "current-time";
      return true;
    }

    const now = newDate();
    const rangeContainsToday =
      calendar.view.activeStart <= now && now < calendar.view.activeEnd;
    if (rangeContainsToday && !allowCurrentTimeFallback) return false;

    calendar.scrollToTime(workdayStart);
    scroller.dataset.needtScrollAnchor = "workday-start";
    return true;
  },

  schedule(
    root: HTMLElement,
    calendar: CalendarApi,
    workdayStart: string
  ) {
    let frame = 0;
    let raf = 0;
    let cancelled = false;

    const positionAfterLayout = () => {
      if (cancelled) return;
      frame += 1;
      const positioned = this.position(
        root,
        calendar,
        workdayStart,
        frame >= this.maxLayoutFrames
      );
      if (!positioned && frame < this.maxLayoutFrames) {
        raf = window.requestAnimationFrame(positionAfterLayout);
      }
    };

    raf = window.requestAnimationFrame(() => {
      raf = window.requestAnimationFrame(positionAfterLayout);
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
    };
  },
};
