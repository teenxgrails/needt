"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { LockKeyhole, Sparkles } from "lucide-react";

import {
  BOARD_VIEW_DEFINITIONS,
  BoardViewIcon,
} from "@/components/boards/BoardViewSwitcher";
import {
  BoardViewType,
  boardViewStorageKey,
} from "@/components/boards/board-view-types";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

import { useBoardsStore } from "@/store/boards";

const DEFAULT_COLUMNS = ["Not started", "In progress", "Done"];

export function NewBoardDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createBoard = useBoardsStore((state) => state.createBoard);
  const router = useRouter();
  const [name, setName] = useState("");
  const [creatingView, setCreatingView] = useState<BoardViewType | null>(null);

  const create = async (view: BoardViewType) => {
    setCreatingView(view);
    try {
      const board = await createBoard({
        name: name.trim() || "Untitled board",
        columns: DEFAULT_COLUMNS,
      });
      if (!board) return;

      window.localStorage.setItem(boardViewStorageKey(board.id), view);
      onOpenChange(false);
      setName("");
      router.push(`/boards/${board.id}`);
    } finally {
      setCreatingView(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="!inset-0 !left-0 !top-0 !block !h-dvh !max-h-none !w-screen !max-w-none !translate-x-0 !translate-y-0 !overflow-hidden !rounded-none !border-0 !p-0 sm:!inset-3 sm:!h-[calc(100dvh-1.5rem)] sm:!w-[calc(100vw-1.5rem)] sm:!rounded-xl sm:!border sm:!border-[var(--border-subtle)]"
      >
        <DialogTitle className="sr-only">Create a new board</DialogTitle>

        <header className="flex h-12 items-center gap-2 border-b border-[var(--border-subtle)] px-4 pr-14 text-[13px]">
          <span className="font-medium text-[var(--text-primary)]">
            New board
          </span>
          <span className="inline-flex items-center gap-1 text-[var(--text-muted)]">
            <LockKeyhole className="h-3.5 w-3.5" />
            Personal
          </span>
        </header>

        <main className="h-[calc(100%-3rem)] overflow-y-auto px-5 pb-80 sm:px-8 sm:pb-64">
          <div className="mx-auto max-w-5xl pt-[12vh] sm:pt-[16vh]">
            <div className="mb-5 grid h-12 w-12 place-items-center rounded-lg text-[var(--text-muted)]">
              <Sparkles className="h-8 w-8" />
            </div>
            <div className="relative min-h-[3.5rem] sm:min-h-[4rem]">
              {!name && (
                <span className="pointer-events-none absolute inset-0 text-4xl font-semibold tracking-[-0.04em] text-[var(--text-muted)] sm:text-5xl">
                  Untitled board
                </span>
              )}
              <div
                role="textbox"
                aria-label="Board name"
                contentEditable
                suppressContentEditableWarning
                spellCheck={false}
                style={{ border: "none", boxShadow: "none", outline: "none" }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.preventDefault();
                }}
                onInput={(event) =>
                  setName(event.currentTarget.textContent ?? "")
                }
                className="relative min-h-[3.5rem] w-full text-4xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] outline-none sm:min-h-[4rem] sm:text-5xl"
              />
            </div>
            <p className="mt-3 max-w-xl text-[13px] leading-5 text-[var(--text-muted)]">
              Choose how this workspace opens. Every view uses the same Needt
              tasks, dates, and scheduling data.
            </p>
          </div>
        </main>

        <div className="absolute inset-x-0 bottom-0 border-t border-[var(--border-subtle)] bg-[var(--surface-canvas)] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-5">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Get started with
              </div>
              <div className="flex flex-wrap gap-1.5">
                {BOARD_VIEW_DEFINITIONS.slice(0, 3).map((view) => (
                  <button
                    key={view.type}
                    type="button"
                    disabled={Boolean(creatingView)}
                    onClick={() => void create(view.type)}
                    className="inline-flex h-9 items-center gap-2 rounded-full bg-[var(--surface-control)] px-3 text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-50"
                  >
                    <BoardViewIcon type={view.type} className="h-3.5 w-3.5" />
                    {view.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="needt-overlay-depth w-full overflow-hidden rounded-xl border border-[var(--border-control)] sm:w-72">
              {BOARD_VIEW_DEFINITIONS.map((view) => {
                const Icon = view.icon;
                const isCreating = creatingView === view.type;
                return (
                  <button
                    key={view.type}
                    type="button"
                    disabled={Boolean(creatingView)}
                    onClick={() => void create(view.type)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-50"
                  >
                    <Icon className="h-4 w-4 flex-none text-[var(--text-secondary)]" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium text-[var(--text-primary)]">
                        {isCreating ? "Creating…" : view.label}
                      </span>
                      <span className="block truncate text-[10px] text-[var(--text-muted)]">
                        {view.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
