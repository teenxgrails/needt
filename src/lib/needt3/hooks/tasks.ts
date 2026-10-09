"use client";

import { useQuery } from "@tanstack/react-query";

import { newDate } from "@/lib/date-utils";
import { liveTasks, trashedTasks } from "@/lib/needt3/derive";
import {
  type ApiTask,
  type V3Task,
  type V3TaskPatch,
  taskFromApi,
  taskPatchToApi,
} from "@/lib/needt3/map";
import { type TaskFilter, qk } from "@/lib/needt3/query-keys";

import {
  dropListItem,
  fetchJson,
  findListItem,
  patchListItem,
  previousFields,
  sendJson,
  useUndoableMutation,
} from "./core";
import { useTimeZone } from "./settings";

const TASKS = qk.tasks();

/**
 * Tasks from `GET /api/tasks`, in the prototype's words. Trash is a filter
 * here: `scope: "live"` (default) hides trashed tasks, `"trash"` shows only
 * them.
 */
export function useTasks(filter: TaskFilter = {}) {
  const tz = useTimeZone();
  return useQuery({
    queryKey: qk.tasks(filter),
    queryFn: async () => {
      const rows = await fetchJson<ApiTask[]>("/api/tasks");
      //todo: GET /api/tasks has no trash/project filter yet; filtered here.
      let list = rows.map((r) => taskFromApi(r, tz));
      if (filter.projectId)
        list = list.filter((t) => t.projectId === filter.projectId);
      const scope = filter.scope ?? "live";
      return scope === "live"
        ? liveTasks(list)
        : scope === "trash"
          ? trashedTasks(list)
          : list;
    },
  });
}

export function useTask(id: string | null | undefined) {
  const tz = useTimeZone();
  return useQuery({
    queryKey: qk.task(id ?? ""),
    enabled: !!id,
    queryFn: async () =>
      taskFromApi(await fetchJson<ApiTask>(`/api/tasks/${id}`), tz),
  });
}

interface UpdateVars {
  id: string;
  patch: V3TaskPatch;
}

function applyLocal(t: V3Task, patch: V3TaskPatch): V3Task {
  const next = { ...t, ...patch } as V3Task;
  if ("done" in patch) next.status = patch.done ? "completed" : "todo";
  return next;
}

/** Patch a task. Resolves to `{ result, undo }`; undo writes the old fields back. */
export function useUpdateTask() {
  const tz = useTimeZone();
  return useUndoableMutation<UpdateVars, V3Task>({
    scope: [TASKS, [...qk.task("")].slice(0, 2)],
    label: "update the task",
    inverse: (qc, { id, patch }) => {
      const cur = findListItem<V3Task>(qc, TASKS, id);
      return cur ? { id, patch: previousFields(cur, patch) } : null;
    },
    optimistic: (qc, { id, patch }) => {
      patchListItem<V3Task>(qc, TASKS, id, (t) => applyLocal(t, patch));
      qc.setQueryData<V3Task>(qk.task(id), (t) =>
        t ? applyLocal(t, patch) : t
      );
    },
    request: async ({ id, patch }) =>
      taskFromApi(
        await sendJson<ApiTask>(
          `/api/tasks/${id}`,
          "PUT",
          taskPatchToApi(patch, tz)
        ),
        tz
      ),
  });
}

/** Close or reopen a task. */
export function useToggleTask() {
  const update = useUpdateTask();
  return {
    ...update,
    toggle: (task: Pick<V3Task, "id" | "done">) =>
      update.mutateAsync({ id: task.id, patch: { done: !task.done } }),
  };
}

/** Move a task to Trash (restorable); undo restores it. */
export function useTrashTask() {
  const update = useUpdateTask();
  return {
    ...update,
    trash: (id: string) =>
      update.mutateAsync({
        id,
        patch: { trashedAt: newDate().toISOString() },
      }),
    restore: (id: string) =>
      update.mutateAsync({ id, patch: { trashedAt: null } }),
  };
}

interface CreateVars {
  draft: V3TaskPatch & { title: string };
}

/** Create a task. Undo removes the task it created. */
export function useCreateTask() {
  const tz = useTimeZone();
  return useUndoableMutation<CreateVars | { deleteId: string }, V3Task | null>({
    scope: TASKS,
    label: "create the task",
    inverseFromResult: true,
    inverse: (_qc, vars, result) =>
      "draft" in vars && result ? { deleteId: result.id } : null,
    optimistic: (qc, vars) => {
      if ("deleteId" in vars) dropListItem<V3Task>(qc, TASKS, vars.deleteId);
    },
    request: async (vars) => {
      if ("deleteId" in vars) {
        await sendJson(`/api/tasks/${vars.deleteId}`, "DELETE");
        return null;
      }
      return taskFromApi(
        await sendJson<ApiTask>(
          "/api/tasks",
          "POST",
          taskPatchToApi(vars.draft, tz)
        ),
        tz
      );
    },
  });
}
