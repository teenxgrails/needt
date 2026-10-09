"use client";

import { useQuery } from "@tanstack/react-query";

import { newDate } from "@/lib/date-utils";
import {
  type ApiMoodboard,
  type V3Board,
  boardFromApi,
} from "@/lib/needt3/map";
import { qk } from "@/lib/needt3/query-keys";

import {
  dropListItem,
  fetchJson,
  findListItem,
  patchListItem,
  previousFields,
  sendJson,
  useUndoableMutation,
} from "./core";

const BOARDS = qk.boards();

/**
 * Moodboards. The list carries trashed boards too (`trashedAt` set), so the
 * grid filters with `!trashedAt` and Trash with `trashedAt`.
 */
export function useBoards() {
  return useQuery({
    queryKey: BOARDS,
    queryFn: async () =>
      (
        await fetchJson<{ moodboards: ApiMoodboard[] }>("/api/moodboards")
      ).moodboards.map(boardFromApi),
  });
}

export function useBoard(id: string | null | undefined) {
  return useQuery({
    queryKey: qk.board(id ?? ""),
    enabled: !!id,
    queryFn: async () =>
      boardFromApi(
        (await fetchJson<{ moodboard: ApiMoodboard }>(`/api/moodboards/${id}`))
          .moodboard
      ),
  });
  //todo: board items (MoodboardItem, migration M2) need an items route.
}

type BoardPatch = Partial<
  Pick<V3Board, "title" | "projectId" | "linkShare" | "pinterestBoardId">
>;

export function useUpdateBoard() {
  return useUndoableMutation<{ id: string; patch: BoardPatch }, V3Board>({
    scope: BOARDS,
    label: "update the board",
    inverse: (qc, { id, patch }) => {
      const cur = findListItem<V3Board>(qc, BOARDS, id);
      return cur ? { id, patch: previousFields(cur, patch) } : null;
    },
    optimistic: (qc, { id, patch }) =>
      patchListItem<V3Board>(qc, BOARDS, id, (b) => ({ ...b, ...patch })),
    request: async ({ id, patch }) =>
      boardFromApi(
        (
          await sendJson<{ moodboard: ApiMoodboard }>(
            `/api/moodboards/${id}`,
            "PATCH",
            patch
          )
        ).moodboard
      ),
  });
}

/** Trash and restore a board; each undoes the other. */
export function useTrashBoard() {
  return useUndoableMutation<{ id: string; trashed: boolean }, unknown>({
    scope: BOARDS,
    label: "move the board",
    inverse: (_qc, { id, trashed }) => ({ id, trashed: !trashed }),
    optimistic: (qc, { id, trashed }) =>
      patchListItem<V3Board>(qc, BOARDS, id, (b) => ({
        ...b,
        trashedAt: trashed ? (b.trashedAt ?? newDate().toISOString()) : null,
      })),
    request: ({ id, trashed }) =>
      sendJson(`/api/moodboards/${id}`, "PATCH", { trashed }),
  });
}

/** Create a board. Undo moves it to Trash. */
export function useCreateBoard() {
  return useUndoableMutation<
    | { draft: { title?: string; projectId?: string | null } }
    | { trashId: string },
    V3Board | null
  >({
    scope: BOARDS,
    label: "create the board",
    inverseFromResult: true,
    inverse: (_qc, vars, result) =>
      "draft" in vars && result ? { trashId: result.id } : null,
    optimistic: (qc, vars) => {
      if ("trashId" in vars) dropListItem<V3Board>(qc, BOARDS, vars.trashId);
    },
    request: async (vars) => {
      if ("trashId" in vars) {
        await sendJson(`/api/moodboards/${vars.trashId}`, "PATCH", {
          trashed: true,
        });
        return null;
      }
      return boardFromApi(
        (
          await sendJson<{ moodboard: ApiMoodboard }>(
            "/api/moodboards",
            "POST",
            vars.draft
          )
        ).moodboard
      );
    },
  });
}
