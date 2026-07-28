"use client";

import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";

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
const SNAP_MINUTES = 15;

interface TimelineInteraction {
  itemId: string;
  taskId: string;
  mode: "move" | "resize-start" | "resize-end";
  pointerId: number;
  originY: number;
  originalStart: Date;
  originalEnd: Date;
  start: Date;
  end: Date;
}

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
  onTaskPlacementChange,
  embedded = false,
}: {
  date: Date;
  items: TimelineItem[];
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onOpenTask: (taskId?: string) => void;
  onTaskPlacementChange: (change: {
    taskId: string;
    start: Date;
    end: Date;
    isResize: boolean;
  }) => Promise<void>;
  embedded?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<TimelineInteraction | null>(null);
  const movedRef = useRef(false);
  const [interaction, setInteraction] = useState<TimelineInteraction | null>(
    null
  );
  const isToday = isSameDay(date, newDate());

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = HOUR_HEIGHT * 5.5;
  }, [date]);

  const current = newDate();
  const currentMinutes = current.getHours() * 60 + current.getMinutes();

  const beginInteraction = (
    event: ReactPointerEvent<HTMLElement>,
    item: TimelineItem,
    mode: TimelineInteraction["mode"]
  ) => {
    if (!item.taskId || item.completed) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.nativeEvent.isTrusted) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    movedRef.current = false;
    const next: TimelineInteraction = {
      itemId: item.id,
      taskId: item.taskId,
      mode,
      pointerId: event.pointerId,
      originY: event.clientY,
      originalStart: item.start,
      originalEnd: item.end,
      start: item.start,
      end: item.end,
    };
    interactionRef.current = next;
    setInteraction(next);
  };

  const updateInteraction = (event: ReactPointerEvent<HTMLElement>) => {
    const currentInteraction = interactionRef.current;
    if (!currentInteraction || currentInteraction.pointerId !== event.pointerId)
      return;
    event.preventDefault();
    const deltaMinutes =
      Math.round(
        (event.clientY - currentInteraction.originY) /
          (HOUR_HEIGHT / 60) /
          SNAP_MINUTES
      ) * SNAP_MINUTES;
    movedRef.current ||= deltaMinutes !== 0;
    const dayStart = new Date(currentInteraction.originalStart);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const minimumDuration = SNAP_MINUTES * 60_000;
    let start = new Date(currentInteraction.originalStart);
    let end = new Date(currentInteraction.originalEnd);

    if (currentInteraction.mode === "move") {
      const duration = end.getTime() - start.getTime();
      start = new Date(start.getTime() + deltaMinutes * 60_000);
      start = new Date(
        Math.max(
          dayStart.getTime(),
          Math.min(start.getTime(), dayEnd.getTime() - duration)
        )
      );
      end = new Date(start.getTime() + duration);
    } else if (currentInteraction.mode === "resize-start") {
      start = new Date(
        Math.max(
          dayStart.getTime(),
          Math.min(
            start.getTime() + deltaMinutes * 60_000,
            end.getTime() - minimumDuration
          )
        )
      );
    } else {
      end = new Date(
        Math.min(
          dayEnd.getTime(),
          Math.max(
            end.getTime() + deltaMinutes * 60_000,
            start.getTime() + minimumDuration
          )
        )
      );
    }

    const next = { ...currentInteraction, start, end };
    interactionRef.current = next;
    setInteraction(next);
  };

  const finishInteraction = (event: ReactPointerEvent<HTMLElement>) => {
    const currentInteraction = interactionRef.current;
    if (!currentInteraction || currentInteraction.pointerId !== event.pointerId)
      return;
    interactionRef.current = null;
    setInteraction(null);
    if (!movedRef.current) return;
    void onTaskPlacementChange({
      taskId: currentInteraction.taskId,
      start: currentInteraction.start,
      end: currentInteraction.end,
      isResize: currentInteraction.mode !== "move",
    });
  };

  return (
    <aside
      className={cn(
        "min-h-0 border-l border-[var(--border-subtle)]",
        embedded
          ? "flex h-[72vh] flex-col border-l-0"
          : "hidden xl:flex xl:flex-col"
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
              <span className="-translate-y-2 pr-3 text-right text-[12px] tabular-nums text-[var(--text-muted)]">
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
            const preview =
              interaction?.itemId === item.id ? interaction : undefined;
            const renderedStart = preview?.start ?? item.start;
            const renderedEnd = preview?.end ?? item.end;
            const startMinutes =
              renderedStart.getHours() * 60 + renderedStart.getMinutes();
            const minutes = Math.max(
              15,
              differenceInMinutes(renderedEnd, renderedStart)
            );
            return (
              <div
                key={item.id}
                role={item.taskId ? "button" : undefined}
                tabIndex={item.taskId ? 0 : -1}
                onClick={() => {
                  if (!movedRef.current) onOpenTask(item.taskId);
                  movedRef.current = false;
                }}
                onKeyDown={(event) => {
                  if (
                    item.taskId &&
                    (event.key === "Enter" || event.key === " ")
                  ) {
                    event.preventDefault();
                    onOpenTask(item.taskId);
                  }
                }}
                onPointerDown={(event) => beginInteraction(event, item, "move")}
                onPointerMove={updateInteraction}
                onPointerUp={finishInteraction}
                onPointerCancel={finishInteraction}
                className={cn(
                  "group absolute left-[68px] right-4 z-10 touch-none overflow-hidden rounded-md border border-[var(--border-control)] bg-[var(--surface-raised)] px-2.5 py-1 text-left transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--border-control)] motion-reduce:transition-none",
                  item.taskId &&
                    !item.completed &&
                    "cursor-grab active:cursor-grabbing",
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
                title={`${item.title} · ${format(renderedStart, "p")}–${format(renderedEnd, "p")}`}
              >
                {item.taskId && !item.completed && (
                  <button
                    type="button"
                    aria-label={`Resize ${item.title} start`}
                    onPointerDown={(event) =>
                      beginInteraction(event, item, "resize-start")
                    }
                    onPointerMove={updateInteraction}
                    onPointerUp={finishInteraction}
                    onPointerCancel={finishInteraction}
                    className="absolute inset-x-0 top-0 z-20 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                  />
                )}
                <span className="block truncate text-[13px] font-medium text-[var(--text-primary)]">
                  {item.title}
                </span>
                <span className="block truncate text-[11px] tabular-nums text-[var(--text-muted)]">
                  {format(renderedStart, "p")}–{format(renderedEnd, "p")}
                </span>
                {item.taskId && !item.completed && (
                  <button
                    type="button"
                    aria-label={`Resize ${item.title} end`}
                    onPointerDown={(event) =>
                      beginInteraction(event, item, "resize-end")
                    }
                    onPointerMove={updateInteraction}
                    onPointerUp={finishInteraction}
                    onPointerCancel={finishInteraction}
                    className="absolute inset-x-0 bottom-0 z-20 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
