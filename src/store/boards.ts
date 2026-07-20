import { create } from "zustand";

import { logger } from "@/lib/logger";

const LOG_SOURCE = "boardsStore";

export interface BoardColumn {
  id: string;
  boardId: string;
  name: string;
  color: string | null;
  position: number;
  mappingKey: string | null;
}

export interface Board {
  id: string;
  name: string;
  icon: string | null;
  position: number;
  groupBy: string;
  columns: BoardColumn[];
}

interface BoardsStore {
  boards: Board[];
  loading: boolean;
  loaded: boolean;

  fetchBoards: () => Promise<void>;
  createBoard: (input: {
    name: string;
    icon?: string | null;
    columns?: string[];
  }) => Promise<Board | null>;
  renameBoard: (boardId: string, name: string) => Promise<void>;
  setBoardIcon: (boardId: string, icon: string | null) => Promise<void>;
  deleteBoard: (boardId: string) => Promise<void>;

  addColumn: (boardId: string, name: string) => Promise<BoardColumn>;
  updateColumn: (
    boardId: string,
    columnId: string,
    updates: { name?: string; color?: string | null }
  ) => Promise<void>;
  deleteColumn: (boardId: string, columnId: string) => Promise<void>;
  reorderColumn: (
    boardId: string,
    columnId: string,
    toIndex: number
  ) => Promise<void>;
}

async function json<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return (await response.json()) as T;
}

export const useBoardsStore = create<BoardsStore>((set, get) => ({
  boards: [],
  loading: false,
  loaded: false,

  fetchBoards: async () => {
    set({ loading: true });
    try {
      const data = await json<{ boards: Board[] }>(await fetch("/api/boards"));
      set({ boards: data.boards, loaded: true });
    } catch (error) {
      logger.error(
        "Failed to fetch boards",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
    } finally {
      set({ loading: false });
    }
  },

  createBoard: async (input) => {
    try {
      const data = await json<{ board: Board }>(
        await fetch("/api/boards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        })
      );
      set({ boards: [...get().boards, data.board] });
      return data.board;
    } catch (error) {
      logger.error(
        "Failed to create board",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
      return null;
    }
  },

  renameBoard: async (boardId, name) => {
    await patchBoard(boardId, { name });
    set({
      boards: get().boards.map((board) =>
        board.id === boardId ? { ...board, name } : board
      ),
    });
  },

  setBoardIcon: async (boardId, icon) => {
    await patchBoard(boardId, { icon });
    set({
      boards: get().boards.map((board) =>
        board.id === boardId ? { ...board, icon } : board
      ),
    });
  },

  deleteBoard: async (boardId) => {
    await fetch(`/api/boards/${boardId}`, { method: "DELETE" });
    set({ boards: get().boards.filter((board) => board.id !== boardId) });
  },

  addColumn: async (boardId, name) => {
    const data = await json<{ column: BoardColumn }>(
      await fetch(`/api/boards/${boardId}/columns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
    );
    set({
      boards: get().boards.map((board) =>
        board.id === boardId
          ? { ...board, columns: [...board.columns, data.column] }
          : board
      ),
    });
    return data.column;
  },

  updateColumn: async (boardId, columnId, updates) => {
    await fetch(`/api/boards/${boardId}/columns/${columnId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    set({
      boards: get().boards.map((board) =>
        board.id === boardId
          ? {
              ...board,
              columns: board.columns.map((column) =>
                column.id === columnId ? { ...column, ...updates } : column
              ),
            }
          : board
      ),
    });
  },

  deleteColumn: async (boardId, columnId) => {
    await fetch(`/api/boards/${boardId}/columns/${columnId}`, {
      method: "DELETE",
    });
    set({
      boards: get().boards.map((board) =>
        board.id === boardId
          ? {
              ...board,
              columns: board.columns.filter((column) => column.id !== columnId),
            }
          : board
      ),
    });
  },

  reorderColumn: async (boardId, columnId, toIndex) => {
    await fetch(`/api/boards/${boardId}/columns/${columnId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toIndex }),
    });
    await get().fetchBoards();
  },
}));

async function patchBoard(
  boardId: string,
  body: Record<string, unknown>
): Promise<void> {
  await fetch(`/api/boards/${boardId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
