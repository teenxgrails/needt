"use client";

import { useEffect, useState } from "react";

import { CalendarDays, Plus, Smile } from "lucide-react";

import { BoardViewTabs } from "@/components/boards/BoardViewSwitcher";
import { BoardViewRenderer } from "@/components/boards/BoardViews";
import {
  BoardViewType,
  boardViewStorageKey,
  isBoardViewType,
} from "@/components/boards/board-view-types";
import { TaskModal } from "@/components/tasks/TaskModal";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { useBoardDetail } from "@/hooks/use-board-detail";
import { useTaskMutations } from "@/hooks/useTaskMutations";

import { useBoardsStore } from "@/store/boards";
import { useTaskStore } from "@/store/task";

import { NewTask, Task } from "@/types/task";

interface BoardCanvasProps {
  boardId: string;
}

const BOARD_ICONS = ["📋", "🧭", "🎯", "🪴", "🚀", "📚", "💡", "🗂️"];

export function BoardCanvas({ boardId }: BoardCanvasProps) {
  const { board, calendarEvents, loading, error, moveCard, addCard, refresh } =
    useBoardDetail(boardId);
  const addColumn = useBoardsStore((state) => state.addColumn);
  const renameBoard = useBoardsStore((state) => state.renameBoard);
  const setBoardIcon = useBoardsStore((state) => state.setBoardIcon);
  const { createTask, updateTask } = useTaskMutations();
  const { tags, createTag } = useTaskStore();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [creatingTask, setCreatingTask] = useState(false);
  const [activeView, setActiveView] = useState<BoardViewType>("board");
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (board) setName(board.name);
  }, [board]);

  useEffect(() => {
    const stored = window.localStorage.getItem(boardViewStorageKey(boardId));
    if (isBoardViewType(stored)) setActiveView(stored);
  }, [boardId]);

  const selectView = (view: BoardViewType) => {
    setActiveView(view);
    window.localStorage.setItem(boardViewStorageKey(boardId), view);
  };

  const saveName = async () => {
    if (!board) return;
    const nextName = name.trim() || "Untitled board";
    setName(nextName);
    if (nextName === board.name) return;
    setSavingName(true);
    try {
      await renameBoard(board.id, nextName);
      await refresh();
    } finally {
      setSavingName(false);
    }
  };

  const chooseIcon = async (icon: string | null) => {
    if (!board) return;
    await setBoardIcon(board.id, icon);
    await refresh();
  };

  const createColumn = async () => {
    if (!board) return;
    await addColumn(board.id, "New stage");
    await refresh();
  };

  const ensureFirstColumn = async () => {
    if (!board) return null;
    return board.columns[0] ?? (await addColumn(board.id, "Not started"));
  };

  if (loading) {
    return (
      <div className="needt-page-depth grid h-full place-items-center text-sm text-[var(--text-secondary)]">
        Loading board…
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="needt-page-depth grid h-full place-items-center px-6 text-center text-sm text-[var(--text-secondary)]">
        This board couldn&apos;t be loaded.
      </div>
    );
  }

  return (
    <div className="needt-page-depth flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex h-11 flex-none items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-1.5 text-[12px] text-[var(--text-muted)]">
          <span>Boards</span>
          <span aria-hidden="true">/</span>
          <span className="truncate text-[var(--text-secondary)]">
            {board.name}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {calendarEvents.length > 0 && (
            <span className="hidden items-center gap-1.5 px-2 text-[11px] text-[var(--text-muted)] sm:inline-flex">
              <CalendarDays className="h-3.5 w-3.5" />
              {calendarEvents.length} calendar items
            </span>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex-none px-4 pb-3 pt-7 sm:px-6 md:px-8 md:pt-10 xl:px-16">
          <div className="mx-auto max-w-[1500px]">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="mb-3 grid h-10 min-w-10 place-items-center rounded-md px-1 text-3xl text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                  aria-label="Choose board icon"
                >
                  {board.icon || <Smile className="h-6 w-6" />}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 bg-[var(--popover-bg)] p-3 text-[var(--text-primary)]">
                <div className="mb-2 text-[13px] font-semibold">Board icon</div>
                <div className="grid grid-cols-4 gap-1">
                  {BOARD_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => void chooseIcon(icon)}
                      className="grid h-10 place-items-center rounded-md text-xl hover:bg-[var(--surface-hover)]"
                    >
                      {icon}
                    </button>
                  ))}
                </div>
                {board.icon && (
                  <button
                    type="button"
                    onClick={() => void chooseIcon(null)}
                    className="mt-2 w-full rounded-md py-1.5 text-[12px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                  >
                    Remove icon
                  </button>
                )}
              </PopoverContent>
            </Popover>

            <h1 aria-label={board.name}>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                style={{ border: "none", boxShadow: "none", outline: "none" }}
                onBlur={() => void saveName()}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                  if (event.key === "Escape") {
                    setName(board.name);
                    event.currentTarget.blur();
                  }
                }}
                aria-label="Board name"
                className="block w-full appearance-none border-0 bg-transparent p-0 text-3xl font-semibold tracking-[-0.035em] text-[var(--text-primary)] outline-none ring-0 placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 sm:text-4xl"
                placeholder="Untitled board"
              />
            </h1>
            <p className="mt-2 text-[12px] text-[var(--text-muted)]">
              {board.tasks.length} task{board.tasks.length === 1 ? "" : "s"}
              {savingName ? " · Saving…" : ""}
            </p>
          </div>
        </div>

        <div className="flex-none border-b border-[var(--border-subtle)] px-2 sm:px-4 md:px-6 xl:px-14">
          <div className="mx-auto flex max-w-[1532px] items-center justify-between gap-3">
            <div className="overflow-x-auto py-1">
              <BoardViewTabs value={activeView} onChange={selectView} />
            </div>
            <div className="flex flex-none items-center gap-1">
              {activeView === "board" && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="hidden sm:inline-flex"
                  onClick={() => void createColumn()}
                >
                  Add stage
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                onClick={() => setCreatingTask(true)}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                New
              </Button>
            </div>
          </div>
        </div>

        <main className="min-h-0 flex-1 pt-4">
          <BoardViewRenderer
            view={activeView}
            board={board}
            calendarEvents={calendarEvents}
            onOpenTask={setEditingTask}
            onAddCard={async (columnId, title) => {
              await addCard(columnId, title);
            }}
            onMoveCard={moveCard}
          />
        </main>
      </div>

      <TaskModal
        isOpen={Boolean(editingTask) || creatingTask}
        onClose={() => {
          setEditingTask(null);
          setCreatingTask(false);
        }}
        task={editingTask ?? undefined}
        tags={tags}
        onCreateTag={(tagName, color) =>
          createTag({ name: tagName, color: color || "" })
        }
        onSave={async (payload: NewTask) => {
          if (editingTask) {
            await updateTask(editingTask.id, payload);
          } else {
            const firstColumn = await ensureFirstColumn();
            await createTask({
              ...payload,
              boardId: board.id,
              boardColumnId: firstColumn?.id ?? null,
            });
          }
          setEditingTask(null);
          setCreatingTask(false);
          await refresh();
        }}
      />
    </div>
  );
}
