"use client";

import { useMemo, useState } from "react";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GripVertical,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { cn } from "@/lib/utils";

import type { BoardCalendarEvent, BoardDetail } from "@/hooks/use-board-detail";

import type { BoardColumn } from "@/store/boards";

import { Priority, Task, TaskStatus } from "@/types/task";

import type { BoardViewType } from "./board-view-types";

interface BoardViewsProps {
  view: BoardViewType;
  board: BoardDetail;
  calendarEvents: BoardCalendarEvent[];
  onOpenTask: (task: Task) => void;
  onAddCard: (columnId: string, title: string) => Promise<void>;
  onMoveCard: (
    taskId: string,
    columnId: string,
    toIndex: number
  ) => Promise<void>;
}

interface DatedBoardItem {
  id: string;
  title: string;
  start: Date;
  end: Date;
  kind: "task" | "event";
  color?: string | null;
  task?: Task;
}

export function BoardViewRenderer(props: BoardViewsProps) {
  switch (props.view) {
    case "table":
      return <BoardTableView {...props} />;
    case "list":
      return <BoardListView {...props} />;
    case "timeline":
      return <BoardTimelineView {...props} />;
    case "calendar":
      return <BoardCalendarView {...props} />;
    case "gallery":
      return <BoardGalleryView {...props} />;
    case "board":
    default:
      return <BoardKanbanView {...props} />;
  }
}

function BoardTableView({ board, onOpenTask }: BoardViewsProps) {
  const columnById = useMemo(
    () => new Map(board.columns.map((column) => [column.id, column])),
    [board.columns]
  );

  return (
    <div className="h-full overflow-auto px-4 pb-10 md:px-8">
      <div className="min-w-[760px] border-y border-[var(--border-subtle)]">
        <div className="grid grid-cols-[minmax(260px,1.8fr)_minmax(150px,1fr)_140px_120px_100px] text-[11px] font-medium text-[var(--text-muted)]">
          {["Name", "Stage", "Date", "Priority", "Estimate"].map((label) => (
            <div
              key={label}
              className="border-r border-[var(--border-subtle)] px-3 py-2 last:border-r-0"
            >
              {label}
            </div>
          ))}
        </div>

        {board.tasks.length === 0 ? (
          <EmptyViewMessage label="No tasks in this table yet." />
        ) : (
          board.tasks.map((task) => {
            const column = task.boardColumnId
              ? columnById.get(task.boardColumnId)
              : undefined;
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => onOpenTask(task)}
                className="grid w-full grid-cols-[minmax(260px,1.8fr)_minmax(150px,1fr)_140px_120px_100px] border-t border-[var(--border-subtle)] text-left text-[13px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
              >
                <span className="truncate border-r border-[var(--border-subtle)] px-3 py-2.5 font-medium text-[var(--text-primary)]">
                  {task.title}
                </span>
                <span className="border-r border-[var(--border-subtle)] px-3 py-2.5">
                  <StageLabel column={column} />
                </span>
                <span className="border-r border-[var(--border-subtle)] px-3 py-2.5 tabular-nums">
                  {formatTaskDate(task)}
                </span>
                <span className="border-r border-[var(--border-subtle)] px-3 py-2.5 capitalize">
                  {task.priority ?? "—"}
                </span>
                <span className="px-3 py-2.5 tabular-nums">
                  {task.duration ? `${task.duration}m` : "—"}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function BoardListView({ board, onOpenTask }: BoardViewsProps) {
  const grouped = useMemo(() => tasksByColumn(board), [board]);

  return (
    <div className="h-full overflow-y-auto px-4 pb-12 md:px-8">
      <div className="mx-auto max-w-5xl space-y-7">
        {board.tasks.length === 0 && (
          <EmptyViewMessage label="No tasks in this list yet." />
        )}
        {grouped.map(({ column, tasks }) => (
          <section key={column?.id ?? "ungrouped"}>
            <header className="mb-1 flex items-center gap-2 px-2 py-1.5">
              <StageLabel column={column} />
              <span className="text-[11px] tabular-nums text-[var(--text-muted)]">
                {tasks.length}
              </span>
            </header>
            <div className="border-t border-[var(--border-subtle)]">
              {tasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onOpenTask(task)}
                  className="group flex min-h-11 w-full items-center gap-3 border-b border-[var(--border-subtle)] px-2 text-left transition-colors hover:bg-[var(--surface-hover)]"
                >
                  <span
                    className={cn(
                      "h-4 w-4 flex-none rounded border border-[var(--border-control)]",
                      task.status === TaskStatus.COMPLETED &&
                        "bg-[var(--surface-control)]"
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--text-primary)]">
                    {task.title}
                  </span>
                  <TaskMeta task={task} />
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function BoardGalleryView({ board, onOpenTask }: BoardViewsProps) {
  const columnById = useMemo(
    () => new Map(board.columns.map((column) => [column.id, column])),
    [board.columns]
  );

  return (
    <div className="h-full overflow-y-auto px-4 pb-12 md:px-8">
      {board.tasks.length === 0 ? (
        <EmptyViewMessage label="No tasks in this gallery yet." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {board.tasks.map((task) => {
            const column = task.boardColumnId
              ? columnById.get(task.boardColumnId)
              : undefined;
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => onOpenTask(task)}
                className="needt-panel-depth group min-h-44 rounded-lg border border-[var(--border-subtle)] p-4 text-left transition-[border-color,background-color,transform] duration-150 hover:-translate-y-0.5 hover:border-[var(--border-control)] hover:bg-[var(--surface-control)] hover:bg-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <StageLabel column={column} />
                  <span className="text-[11px] capitalize text-[var(--text-muted)]">
                    {task.priority && task.priority !== Priority.NONE
                      ? task.priority
                      : "Task"}
                  </span>
                </div>
                <h3 className="mt-8 line-clamp-3 text-[15px] font-semibold leading-6 text-[var(--text-primary)]">
                  {task.title}
                </h3>
                <div className="mt-5 flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-muted)]">
                  <TaskMeta task={task} />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BoardTimelineView({
  board,
  calendarEvents,
  onOpenTask,
}: BoardViewsProps) {
  const [rangeStart, setRangeStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const days = useMemo(
    () =>
      eachDayOfInterval({ start: rangeStart, end: addDays(rangeStart, 13) }),
    [rangeStart]
  );
  const rangeEnd = days[days.length - 1];
  const items = useMemo(
    () =>
      datedItems(board.tasks, calendarEvents).filter(
        (item) => item.end >= rangeStart && item.start <= addDays(rangeEnd, 1)
      ),
    [board.tasks, calendarEvents, rangeEnd, rangeStart]
  );
  const undated = board.tasks.filter((task) => !taskDate(task));

  return (
    <div className="flex h-full flex-col overflow-hidden px-4 pb-8 md:px-8">
      <DateRangeToolbar
        label={`${format(rangeStart, "MMM d")} – ${format(rangeEnd, "MMM d, yyyy")}`}
        onPrevious={() => setRangeStart((date) => addDays(date, -14))}
        onToday={() =>
          setRangeStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
        }
        onNext={() => setRangeStart((date) => addDays(date, 14))}
      />

      <div className="flex-1 overflow-auto border-y border-[var(--border-subtle)]">
        <div className="min-w-[920px]">
          <div className="grid grid-cols-[220px_1fr] border-b border-[var(--border-subtle)]">
            <div className="sticky left-0 z-10 bg-[var(--surface-canvas)] px-3 py-2 text-[11px] text-[var(--text-muted)]">
              Item
            </div>
            <div
              className="grid"
              style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}
            >
              {days.map((day) => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "border-l border-[var(--border-subtle)] px-1 py-2 text-center text-[10px] text-[var(--text-muted)]",
                    isSameDay(day, new Date()) &&
                      "bg-[var(--surface-hover)] text-[var(--text-primary)]"
                  )}
                >
                  <span className="block uppercase">{format(day, "EEE")}</span>
                  <span className="mt-0.5 block text-[12px] tabular-nums">
                    {format(day, "d")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {items.length === 0 && (
            <EmptyViewMessage label="Nothing scheduled in this two-week range." />
          )}
          {items.map((item) => {
            const startOffset = Math.max(
              0,
              differenceInCalendarDays(item.start, rangeStart)
            );
            const endOffset = Math.min(
              13,
              differenceInCalendarDays(item.end, rangeStart)
            );
            const span = Math.max(1, endOffset - startOffset + 1);
            return (
              <div
                key={`${item.kind}:${item.id}`}
                className="grid min-h-11 grid-cols-[220px_1fr] border-b border-[var(--border-subtle)]"
              >
                <button
                  type="button"
                  disabled={!item.task}
                  onClick={() => item.task && onOpenTask(item.task)}
                  className="sticky left-0 z-10 truncate bg-[var(--surface-canvas)] px-3 text-left text-[12px] font-medium text-[var(--text-primary)] disabled:cursor-default"
                >
                  {item.title}
                </button>
                <div
                  className="relative grid"
                  style={{
                    gridTemplateColumns: "repeat(14, minmax(0, 1fr))",
                  }}
                >
                  {days.map((day) => (
                    <div
                      key={day.toISOString()}
                      className="border-l border-[var(--border-subtle)]"
                    />
                  ))}
                  <button
                    type="button"
                    disabled={!item.task}
                    onClick={() => item.task && onOpenTask(item.task)}
                    className={cn(
                      "absolute top-2 h-7 truncate rounded px-2 text-left text-[11px] font-medium",
                      item.kind === "task"
                        ? "bg-[var(--surface-raised)] text-[var(--text-primary)]"
                        : "border-l-2 bg-[var(--surface-control)] text-[var(--text-secondary)]"
                    )}
                    style={{
                      left: `${(startOffset / 14) * 100}%`,
                      width: `calc(${(span / 14) * 100}% - 4px)`,
                      borderLeftColor:
                        item.kind === "event"
                          ? item.color || "var(--border-control)"
                          : undefined,
                    }}
                  >
                    {item.title}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {undated.length > 0 && (
        <p className="pt-3 text-[11px] text-[var(--text-muted)]">
          {undated.length} task{undated.length === 1 ? "" : "s"} without a date
          are hidden from the timeline.
        </p>
      )}
    </div>
  );
}

function BoardCalendarView({
  board,
  calendarEvents,
  onOpenTask,
}: BoardViewsProps) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const items = useMemo(
    () => datedItems(board.tasks, calendarEvents),
    [board.tasks, calendarEvents]
  );

  return (
    <div className="flex h-full flex-col overflow-hidden px-3 pb-6 sm:px-4 md:px-8">
      <DateRangeToolbar
        label={format(month, "MMMM yyyy")}
        onPrevious={() => setMonth((date) => subMonths(date, 1))}
        onToday={() => setMonth(startOfMonth(new Date()))}
        onNext={() => setMonth((date) => addMonths(date, 1))}
      />
      <div className="flex-1 overflow-auto border-y border-[var(--border-subtle)]">
        <div className="min-w-[700px]">
          <div className="grid grid-cols-7 border-b border-[var(--border-subtle)]">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
              <div
                key={label}
                className="border-r border-[var(--border-subtle)] px-2 py-2 text-center text-[10px] font-medium uppercase text-[var(--text-muted)] last:border-r-0"
              >
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const dayItems = items.filter((item) =>
                isSameDay(item.start, day)
              );
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "min-h-28 border-b border-r border-[var(--border-subtle)] p-1.5 last:border-r-0",
                    !isSameMonth(day, month) && "opacity-45"
                  )}
                >
                  <div
                    className={cn(
                      "mb-1 grid h-6 w-6 place-items-center rounded-full text-[11px] tabular-nums text-[var(--text-secondary)]",
                      isSameDay(day, new Date()) &&
                        "bg-[var(--text-primary)] text-[var(--surface-canvas)]"
                    )}
                  >
                    {format(day, "d")}
                  </div>
                  <div className="space-y-1">
                    {dayItems.slice(0, 3).map((item) => (
                      <button
                        key={`${item.kind}:${item.id}`}
                        type="button"
                        disabled={!item.task}
                        onClick={() => item.task && onOpenTask(item.task)}
                        className={cn(
                          "block w-full truncate rounded px-1.5 py-1 text-left text-[10px] font-medium",
                          item.kind === "task"
                            ? "bg-[var(--surface-raised)] text-[var(--text-primary)]"
                            : "border-l-2 bg-[var(--surface-control)] text-[var(--text-secondary)]"
                        )}
                        style={{
                          borderLeftColor:
                            item.kind === "event"
                              ? item.color || "var(--border-control)"
                              : undefined,
                        }}
                      >
                        {item.title}
                      </button>
                    ))}
                    {dayItems.length > 3 && (
                      <div className="px-1 text-[10px] text-[var(--text-muted)]">
                        +{dayItems.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function BoardKanbanView({
  board,
  onOpenTask,
  onAddCard,
  onMoveCard,
}: BoardViewsProps) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const cardsByColumn = useMemo(() => tasksByColumnMap(board), [board]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTaskId(null);
    if (!over) return;

    const taskId = String(active.id);
    const overId = String(over.id);
    let targetColumnId: string | null = null;
    let targetIndex = 0;
    const overColumn = board.columns.find(
      (column) => `col:${column.id}` === overId
    );

    if (overColumn) {
      targetColumnId = overColumn.id;
      targetIndex = cardsByColumn.get(overColumn.id)?.length ?? 0;
    } else {
      for (const column of board.columns) {
        const tasks = cardsByColumn.get(column.id) ?? [];
        const index = tasks.findIndex((task) => task.id === overId);
        if (index !== -1) {
          targetColumnId = column.id;
          targetIndex = index;
          break;
        }
      }
    }

    if (targetColumnId) {
      void onMoveCard(taskId, targetColumnId, targetIndex);
    }
  };

  const activeTask = activeTaskId
    ? board.tasks.find((task) => task.id === activeTaskId)
    : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(event: DragStartEvent) =>
        setActiveTaskId(String(event.active.id))
      }
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTaskId(null)}
    >
      <div className="flex h-full snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-10 md:snap-none md:px-8">
        {board.columns.length === 0 && (
          <div className="grid w-[calc(100vw-2rem)] max-w-md flex-none snap-start place-items-center rounded-lg border border-dashed border-[var(--border-control)] px-8 py-16 text-center sm:w-80">
            <div>
              <div className="text-sm font-medium text-[var(--text-primary)]">
                Add the first stage
              </div>
              <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                This canvas is empty. Create a column to start arranging tasks.
              </p>
            </div>
          </div>
        )}
        {board.columns.map((column) => (
          <BoardColumnView
            key={column.id}
            column={column}
            cards={cardsByColumn.get(column.id) ?? []}
            onOpenCard={onOpenTask}
            onAddCard={(title) => onAddCard(column.id, title)}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "ease-out" }}>
        {activeTask ? (
          <div className="needt-panel-depth w-64 rotate-1 rounded-md border border-[var(--border-control)] px-3 py-2 text-left text-[13px] text-[var(--text-primary)] shadow-lg">
            {activeTask.title}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function BoardColumnView({
  column,
  cards,
  onOpenCard,
  onAddCard,
}: {
  column: BoardColumn;
  cards: Task[];
  onOpenCard: (task: Task) => void;
  onAddCard: (title: string) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");

  const submit = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    await onAddCard(trimmed);
    setTitle("");
    setAdding(false);
  };

  return (
    <section className="flex w-[calc(100vw-2rem)] max-w-[300px] flex-none snap-start flex-col sm:w-[280px]">
      <header className="mb-2 flex min-h-9 items-center gap-2 px-1">
        <StageLabel column={column} />
        <span className="text-[11px] tabular-nums text-[var(--text-muted)]">
          {cards.length}
        </span>
      </header>

      <ColumnDroppable columnId={column.id}>
        <SortableContext
          items={cards.map((card) => card.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex min-h-16 flex-col gap-2">
            {cards.map((task) => (
              <SortableCard key={task.id} task={task} onOpen={onOpenCard} />
            ))}
          </div>
        </SortableContext>
      </ColumnDroppable>

      <div className="pt-2">
        {adding ? (
          <div className="needt-panel-depth rounded-lg border border-[var(--border-control)] p-2">
            <Input
              autoFocus
              value={title}
              placeholder="Task name"
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void submit();
                if (event.key === "Escape") setAdding(false);
              }}
            />
            <div className="mt-2 flex gap-2">
              <Button type="button" size="sm" onClick={submit}>
                Add
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setAdding(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          >
            <Plus className="h-4 w-4" />
            New
          </button>
        )}
      </div>
    </section>
  );
}

function ColumnDroppable({
  columnId,
  children,
}: {
  columnId: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useSortable({ id: `col:${columnId}` });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-20 flex-1 rounded-lg p-1 transition-colors duration-150",
        isOver && "bg-[var(--surface-hover)]"
      )}
    >
      {children}
    </div>
  );
}

function SortableCard({
  task,
  onOpen,
}: {
  task: Task;
  onOpen: (task: Task) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "needt-panel-depth group relative min-h-12 rounded-lg border border-[var(--border-subtle)] text-left text-[13px] text-[var(--text-primary)] transition-[border-color,background-color,opacity] duration-150 hover:border-[var(--border-control)] hover:bg-[var(--surface-control)] hover:bg-none",
        isDragging && "opacity-25"
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(task)}
        className="block min-h-12 w-full px-3 py-2.5 pr-10 text-left"
      >
        <span className="line-clamp-3 font-medium">{task.title}</span>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-muted)]">
          <TaskMeta task={task} />
        </div>
      </button>
      <button
        type="button"
        aria-label={`Drag ${task.title}`}
        className="absolute right-0 top-0 grid h-11 w-10 cursor-grab place-items-center rounded-r-lg text-[var(--text-muted)] opacity-70 transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] active:cursor-grabbing sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
    </div>
  );
}

function DateRangeToolbar({
  label,
  onPrevious,
  onToday,
  onNext,
}: {
  label: string;
  onPrevious: () => void;
  onToday: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <span className="text-[13px] font-medium text-[var(--text-primary)]">
        {label}
      </span>
      <div className="flex items-center gap-1">
        <Button type="button" size="sm" variant="ghost" onClick={onToday}>
          Today
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Previous range"
          onClick={onPrevious}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Next range"
          onClick={onNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function StageLabel({ column }: { column?: BoardColumn }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 rounded-md bg-[var(--surface-control)] px-2 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
      <span
        className="h-2 w-2 flex-none rounded-full bg-[var(--text-muted)]"
        style={{ backgroundColor: column?.color || undefined }}
      />
      <span className="truncate">{column?.name ?? "No stage"}</span>
    </span>
  );
}

function TaskMeta({ task }: { task: Task }) {
  const date = taskDate(task);
  return (
    <>
      {date && (
        <span className="inline-flex items-center gap-1 tabular-nums">
          <CalendarClock className="h-3 w-3" />
          {format(date, "MMM d")}
        </span>
      )}
      {task.duration && (
        <span className="inline-flex items-center gap-1 tabular-nums">
          <Clock3 className="h-3 w-3" />
          {task.duration}m
        </span>
      )}
    </>
  );
}

function EmptyViewMessage({ label }: { label: string }) {
  return (
    <div className="grid min-h-32 place-items-center px-6 text-center text-[13px] text-[var(--text-muted)]">
      {label}
    </div>
  );
}

function tasksByColumnMap(board: BoardDetail): Map<string, Task[]> {
  const map = new Map<string, Task[]>();
  for (const column of board.columns) map.set(column.id, []);
  for (const task of board.tasks) {
    if (task.boardColumnId && map.has(task.boardColumnId)) {
      map.get(task.boardColumnId)!.push(task);
    }
  }
  for (const tasks of map.values()) {
    tasks.sort((a, b) => (a.boardPosition ?? 0) - (b.boardPosition ?? 0));
  }
  return map;
}

function tasksByColumn(
  board: BoardDetail
): Array<{ column?: BoardColumn; tasks: Task[] }> {
  const map = tasksByColumnMap(board);
  const groups: Array<{ column?: BoardColumn; tasks: Task[] }> =
    board.columns.map((column) => ({
      column,
      tasks: map.get(column.id) ?? [],
    }));
  const ungrouped = board.tasks.filter(
    (task) => !task.boardColumnId || !map.has(task.boardColumnId)
  );
  if (ungrouped.length > 0)
    groups.push({ column: undefined, tasks: ungrouped });
  return groups;
}

function taskDate(task: Task): Date | null {
  const value =
    task.scheduledStart ?? task.startDate ?? task.dueDate ?? task.deadline;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function taskEndDate(task: Task, start: Date): Date {
  const value = task.scheduledEnd;
  if (value) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return new Date(start.getTime() + Math.max(task.duration ?? 30, 30) * 60_000);
}

function formatTaskDate(task: Task): string {
  const date = taskDate(task);
  return date ? format(date, "MMM d, yyyy") : "—";
}

function datedItems(
  tasks: Task[],
  calendarEvents: BoardCalendarEvent[]
): DatedBoardItem[] {
  const taskItems = tasks.flatMap<DatedBoardItem>((task) => {
    const start = taskDate(task);
    if (!start) return [];
    return [
      {
        id: task.id,
        title: task.title,
        start,
        end: taskEndDate(task, start),
        kind: "task",
        task,
      },
    ];
  });
  const eventItems = calendarEvents.flatMap<DatedBoardItem>((event) => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
    return [
      {
        id: event.id,
        title: event.title,
        start,
        end,
        kind: "event",
        color: event.feed?.color,
      },
    ];
  });
  return [...taskItems, ...eventItems].sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  );
}
