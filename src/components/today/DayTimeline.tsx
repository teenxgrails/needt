"use client";

import { useEffect, useRef } from "react";

import { ChevronLeft, ChevronRight, Clock3 } from "lucide-react";

import {
  differenceInMinutes,
  format,
  isSameDay,
  newDate,
} from "@/lib/date-utils";
import { cn } from "@/lib/utils";

export interface TimelineItem {
  id: string;
  title: string;
  color: string;
  taskId?: string;
  start: Date;
  end: Date;
  completed: boolean;
}

const HOUR_HEIGHT = 72;

function timezoneLabel() {
  const part = new Intl.DateTimeFormat([], { timeZoneName: "short" })
    .formatToParts(newDate())
    .find((item) => item.type === "timeZoneName");
  return part?.value ?? "Local";
}

export function DayTimeline({
  date,
  items,
  onPrevious,
  onNext,
  onToday,
  onOpenTask,
  embedded = false,
}: {
  date: Date;
  items: TimelineItem[];
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onOpenTask: (taskId?: string) => void;
  embedded?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isToday = isSameDay(date, newDate());

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = HOUR_HEIGHT * 5.5;
  }, [date]);

  const current = newDate();
  const currentMinutes = current.getHours() * 60 + current.getMinutes();

  return (
    <aside
      className={cn(
        "min-h-0 border-l border-[var(--border-subtle)]",
        embedded ? "flex h-[72vh] flex-col border-l-0" : "hidden xl:flex xl:flex-col"
      )}
    >
      <header className="flex h-[92px] flex-none items-center border-b border-[var(--border-subtle)] px-5 2xl:px-6">
        <button
          type="button"
          className="mr-3 rounded-md px-1.5 py-1 text-[12px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--border-control)]"
          title="Local timezone"
        >
          {timezoneLabel()}
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-[var(--color-accent)]">
            {isToday ? "Today" : "Agenda"}
          </p>
          <h2 className="mt-1 truncate text-[18px] font-medium text-[var(--text-primary)]">
            {format(date, "EEE MMM d")}
          </h2>
        </div>
        <div className="flex items-center gap-1 text-[var(--text-muted)]">
          <button
            type="button"
            onClick={onPrevious}
            aria-label="Previous day in timeline"
            className="grid h-10 w-10 place-items-center rounded-md hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--border-control)]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label="Next day in timeline"
            className="grid h-10 w-10 place-items-center rounded-md hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--border-control)]"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onToday}
            aria-label="Jump timeline to today"
            className="grid h-10 w-10 place-items-center rounded-md hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--border-control)]"
          >
            <Clock3 className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="needt-native-scroll min-h-0 flex-1 overflow-y-auto"
      >
        <div
          className="relative"
          style={{ height: HOUR_HEIGHT * 24 }}
          aria-label="One day timeline"
        >
          {Array.from({ length: 24 }, (_, hour) => (
            <div
              key={hour}
              className="grid grid-cols-[64px_1fr]"
              style={{ height: HOUR_HEIGHT }}
            >
              <span className="-translate-y-2 bg-[var(--surface-canvas)] pr-3 text-right text-[12px] tabular-nums text-[var(--text-muted)]">
                {new Intl.DateTimeFormat([], {
                  hour: "numeric",
                  hour12: true,
                }).format(new Date(2000, 0, 1, hour))}
              </span>
              <span className="border-t border-[var(--border-subtle)]" />
            </div>
          ))}

          <div className="absolute bottom-0 left-[64px] right-0 border-t border-[var(--border-subtle)]" />

          {isToday && (
            <div
              className="pointer-events-none absolute left-[60px] right-0 z-20 border-t border-[var(--text-secondary)]"
              style={{ top: (currentMinutes / 60) * HOUR_HEIGHT }}
            >
              <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-[var(--text-primary)]" />
            </div>
          )}

          {items.map((item) => {
            const startMinutes =
              item.start.getHours() * 60 + item.start.getMinutes();
            const minutes = Math.max(
              15,
              differenceInMinutes(item.end, item.start)
            );
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenTask(item.taskId)}
                disabled={!item.taskId}
                className={cn(
                  "absolute left-[68px] right-4 z-10 overflow-hidden rounded-md border border-[var(--border-control)] bg-[var(--surface-raised)] px-2.5 py-1 text-left transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--border-control)] motion-reduce:transition-none",
                  item.completed &&
                    "border-dashed bg-transparent text-[var(--text-muted)]"
                )}
                style={{
                  top: (startMinutes / 60) * HOUR_HEIGHT + 1,
                  minHeight: 32,
                  height: Math.max(32, (minutes / 60) * HOUR_HEIGHT - 2),
                  borderLeftColor: item.color,
                  borderLeftWidth: 4,
                }}
                title={`${item.title} · ${format(item.start, "p")}–${format(item.end, "p")}`}
              >
                <span className="block truncate text-[13px] font-medium text-[var(--text-primary)]">
                  {item.title}
                </span>
                <span className="block truncate text-[11px] tabular-nums text-[var(--text-muted)]">
                  {format(item.start, "p")}–{format(item.end, "p")}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
