"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LayoutGrid, Plus } from "lucide-react";

import { cn } from "@/lib/utils";

import { useBoardsStore } from "@/store/boards";

import { NewBoardDialog } from "./NewBoardDialog";

/**
 * "Boards" section in the sidebar: lists the user's boards and a "+" to create
 * one. Desktop only (the mobile shell uses the bottom tab bar).
 */
export function BoardsSidebarSection() {
  const boards = useBoardsStore((state) => state.boards);
  const loaded = useBoardsStore((state) => state.loaded);
  const fetchBoards = useBoardsStore((state) => state.fetchBoards);
  const pathname = usePathname();
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!loaded) void fetchBoards();
  }, [loaded, fetchBoards]);

  return (
    <div className="mt-3 max-lg:hidden">
      <div className="mb-1 flex items-center justify-between px-2.5">
        <Link
          href="/boards"
          className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          Boards
        </Link>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          aria-label="New board"
          className="grid h-5 w-5 place-items-center rounded text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-0.5">
        {boards.length === 0 && (
          <p className="px-2.5 py-1 text-[12px] text-[var(--text-muted)]">
            No boards yet.
          </p>
        )}
        {boards.map((board) => {
          const href = `/boards/${board.id}`;
          const isActive = pathname === href;
          return (
            <Link
              key={board.id}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                isActive
                  ? "bg-[var(--surface-hover)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
              )}
            >
              <span className="flex h-4 w-4 flex-none items-center justify-center">
                {board.icon ? (
                  <span className="text-[13px] leading-none">{board.icon}</span>
                ) : (
                  <LayoutGrid className="h-4 w-4" strokeWidth={1.75} />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate">{board.name}</span>
            </Link>
          );
        })}
      </div>

      <NewBoardDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
