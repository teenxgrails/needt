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
import { CalendarClock, Clock3, GripVertical, Plus } from "lucide-react";

import { TaskModal } from "@/components/tasks/TaskModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { cn } from "@/lib/utils";

import { useBoardDetail } from "@/hooks/use-board-detail";
import { useTaskMutations } from "@/hooks/useTaskMutations";

import { useBoardsStore } from "@/store/boards";
import { useTaskStore } from "@/store/task";

import { NewTask, Task } from "@/types/task";

interface BoardCanvasProps {
  boardId: string;
}

export function BoardCanvas({ boardId }: BoardCanvasProps) {
  const { board, loading, error, moveCard, addCard, refresh } =
    useBoardDetail(boardId);
  const addColumn = useBoardsStore((state) => state.addColumn);
  const { updateTask } = useTaskMutations();
  const { tags, createTag } = useTaskStore();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Derive per-column ordered card lists from the flat task list.
  const cardsByColumn = useMemo(() => {
    const map = new Map<string, Task[]>();
    if (!board) return map;
    for (const column of board.columns) map.set(column.id, []);
    for (const task of board.tasks) {
      if (task.boardColumnId && map.has(task.boardColumnId)) {
        map.get(task.boardColumnId)!.push(task);
      }
    }
    for (const [, list] of map) {
      list.sort((a, b) => (a.boardPosition ?? 0) - (b.boardPosition ?? 0));
    }
    return map;
  }, [board]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTaskId(null);
    if (!over || !board) return;

    const taskId = String(active.id);
    const overId = String(over.id);

    // The drop target is either a column (empty area) or another card.
    let targetColumnId: string | null = null;
    let targetIndex = 0;

    const overColumn = board.columns.find((c) => `col:${c.id}` === overId);
    if (overColumn) {
      targetColumnId = overColumn.id;
      targetIndex = cardsByColumn.get(overColumn.id)?.length ?? 0;
    } else {
      // over a card: find its column and index
      for (const column of board.columns) {
        const list = cardsByColumn.get(column.id) ?? [];
        const index = list.findIndex((t) => t.id === overId);
        if (index !== -1) {
          targetColumnId = column.id;
          targetIndex = index;
          break;
        }
      }
    }

    if (!targetColumnId) return;
    void moveCard(taskId, targetColumnId, targetIndex);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(String(event.active.id));
  };

  const activeTask = activeTaskId
    ? board?.tasks.find((task) => task.id === activeTaskId)
    : null;

  if (loading) {
    return (
      <div className="grid h-full place-items-center text-sm text-[var(--text-secondary)]">
        Loading board…
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="grid h-full place-items-center px-6 text-center text-sm text-[var(--text-secondary)]">
        This board couldn&apos;t be loaded.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[var(--surface-canvas)]">
      <header className="flex min-h-14 items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-3 sm:min-h-12 sm:py-2">
        {board.icon && <span className="text-lg">{board.icon}</span>}
        <h1 className="text-base font-semibold text-[var(--text-primary)]">
          {board.name}
        </h1>
        {/* //todo(boards): Group by · Sort · Filters · view switcher toolbar,
            persisted per SavedView. */}
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveTaskId(null)}
      >
        <div className="flex flex-1 snap-x snap-mandatory gap-3 overflow-x-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:snap-none">
          {board.columns.length === 0 && (
            <div className="grid w-[calc(100vw-1.5rem)] max-w-md flex-none snap-start place-items-center rounded-lg border border-dashed border-[var(--border-control)] bg-[var(--surface-raised)] px-8 py-16 text-center sm:w-80">
              <div>
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  Start with one clear stage
                </div>
                <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                  Add a column for the next step, then place tasks inside it.
                </p>
              </div>
            </div>
          )}
          {board.columns.map((column) => {
            const cards = cardsByColumn.get(column.id) ?? [];
            return (
              <BoardColumnView
                key={column.id}
                columnId={column.id}
                name={column.name}
                color={column.color}
                cards={cards}
                onOpenCard={setEditingTask}
                onAddCard={(title) => addCard(column.id, title)}
              />
            );
          })}

          <button
            type="button"
            onClick={() => addColumn(board.id, "New column").then(refresh)}
            className="flex h-11 w-[calc(100vw-1.5rem)] max-w-64 flex-none snap-start items-center gap-2 rounded-lg border border-dashed border-[var(--border-control)] px-3 text-sm text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] sm:h-10 sm:w-64"
          >
            <Plus className="h-4 w-4" />
            Add column
          </button>
        </div>
        <DragOverlay dropAnimation={{ duration: 180, easing: "ease-out" }}>
          {activeTask ? (
            <div className="w-64 rotate-1 rounded-md border border-[var(--color-accent)] bg-[var(--surface-panel)] px-3 py-2 text-left text-[13px] text-[var(--text-primary)] shadow-lg">
              {activeTask.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskModal
        isOpen={Boolean(editingTask)}
        onClose={() => setEditingTask(null)}
        task={editingTask ?? undefined}
        tags={tags}
        onCreateTag={(name, color) => createTag({ name, color: color || "" })}
        onSave={async (payload: NewTask) => {
          if (editingTask) await updateTask(editingTask.id, payload);
          setEditingTask(null);
          await refresh();
        }}
      />
    </div>
  );
}

function BoardColumnView({
  columnId,
  name,
  color,
  cards,
  onOpenCard,
  onAddCard,
}: {
  columnId: string;
  name: string;
  color: string | null;
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
    <section className="flex w-[calc(100vw-1.5rem)] flex-none snap-start flex-col rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] sm:w-[272px]">
      <header className="flex min-h-11 items-center gap-2 border-b border-[var(--border-subtle)] px-3 py-2 sm:min-h-9">
        {color && (
          <span
            className="h-2.5 w-2.5 flex-none rounded-full"
            style={{ backgroundColor: color }}
          />
        )}
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--text-primary)]">
          {name}
        </span>
        <span className="flex-none rounded bg-[var(--surface-control)] px-1.5 text-[11px] tabular-nums text-[var(--text-secondary)]">
          {cards.length}
        </span>
      </header>

      <ColumnDroppable columnId={columnId}>
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex min-h-[24px] flex-col gap-2 p-2">
            {cards.length === 0 && (
              <div className="grid min-h-24 place-items-center rounded-md border border-dashed border-[var(--border-control)] px-4 text-center text-[12px] leading-5 text-[var(--text-muted)]">
                Drop a task here or create the first card.
              </div>
            )}
            {cards.map((task) => (
              <SortableCard key={task.id} task={task} onOpen={onOpenCard} />
            ))}
          </div>
        </SortableContext>
      </ColumnDroppable>

      <div className="p-2">
        {adding ? (
          <div className="flex flex-col gap-2">
            <Input
              autoFocus
              value={title}
              placeholder="Card title"
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void submit();
                if (event.key === "Escape") setAdding(false);
              }}
            />
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={submit}>
                Add
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
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
            className="flex min-h-11 w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] sm:min-h-8"
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
        "flex-1 rounded-b-lg transition-colors duration-150",
        isOver && "bg-[color-mix(in_srgb,var(--color-accent)_8%,transparent)]"
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
        "group relative min-h-11 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-panel)] text-left text-[13px] text-[var(--text-primary)] transition-[border-color,background-color,opacity] duration-150 hover:border-[var(--border-control)] hover:bg-[var(--surface-control)]",
        isDragging && "opacity-25"
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(task)}
        className="block min-h-11 w-full px-3 py-2 pr-10 text-left"
      >
        <span className="line-clamp-3 font-medium">{task.title}</span>
        {(task.dueDate || task.duration) && (
          <span className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-muted)]">
            {task.dueDate && (
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-3 w-3" />
                {new Intl.DateTimeFormat(undefined, {
                  month: "short",
                  day: "numeric",
                }).format(new Date(task.dueDate))}
              </span>
            )}
            {task.duration && (
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3 w-3" />
                {task.duration}m
              </span>
            )}
          </span>
        )}
      </button>
      <button
        type="button"
        aria-label={`Drag ${task.title}`}
        className="absolute right-0 top-0 grid h-11 w-10 cursor-grab place-items-center rounded-r-md text-[var(--text-muted)] opacity-70 transition-colors duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] active:cursor-grabbing sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
    </div>
  );
}
