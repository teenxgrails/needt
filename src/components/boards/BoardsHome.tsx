"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { LayoutGrid, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useBoardsStore } from "@/store/boards";

import { NewBoardDialog } from "./NewBoardDialog";

export function BoardsHome() {
  const boards = useBoardsStore((state) => state.boards);
  const loaded = useBoardsStore((state) => state.loaded);
  const loading = useBoardsStore((state) => state.loading);
  const fetchBoards = useBoardsStore((state) => state.fetchBoards);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!loaded) void fetchBoards();
  }, [fetchBoards, loaded]);

  return (
    <div className="needt-page-depth h-full overflow-y-auto px-5 pb-24 pt-10 sm:px-8 md:px-12 lg:pb-10 xl:px-20">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.035em] text-[var(--text-primary)] sm:text-4xl">
              Boards
            </h1>
            <p className="mt-2 text-[13px] text-[var(--text-muted)]">
              Flexible workspaces for tasks, schedules, and calendar context.
            </p>
          </div>
          <Button type="button" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New board
          </Button>
        </div>

        <div className="mt-10 border-t border-[var(--border-subtle)]">
          {loading && !loaded ? (
            <div className="py-14 text-center text-[13px] text-[var(--text-muted)]">
              Loading boards…
            </div>
          ) : boards.length === 0 ? (
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="mt-8 grid min-h-64 w-full place-items-center rounded-xl border border-dashed border-[var(--border-control)] px-6 text-center transition-colors hover:bg-[var(--surface-hover)]"
            >
              <span>
                <LayoutGrid className="mx-auto h-7 w-7 text-[var(--text-muted)]" />
                <span className="mt-4 block text-sm font-medium text-[var(--text-primary)]">
                  Create your first board
                </span>
                <span className="mt-1 block text-xs text-[var(--text-muted)]">
                  Start with any view and switch whenever you like.
                </span>
              </span>
            </button>
          ) : (
            <div className="grid grid-cols-1 gap-px bg-[var(--border-subtle)] sm:grid-cols-2 xl:grid-cols-3">
              {boards.map((board) => (
                <Link
                  key={board.id}
                  href={`/boards/${board.id}`}
                  className="group min-h-44 bg-[var(--surface-canvas)] p-5 transition-colors hover:bg-[var(--surface-hover)]"
                >
                  <div className="text-2xl text-[var(--text-muted)]">
                    {board.icon || <LayoutGrid className="h-6 w-6" />}
                  </div>
                  <h2 className="mt-8 truncate text-[15px] font-semibold text-[var(--text-primary)]">
                    {board.name}
                  </h2>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    {board.columns.length} stage
                    {board.columns.length === 1 ? "" : "s"}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <NewBoardDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
