"use client";

import { useCallback } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { logger } from "@/lib/logger";
import { notify } from "@/lib/notifications";
import {
  beginTaskMutation,
  buildOptimisticTask,
  createOptimisticTaskId,
  enqueueTaskMutation,
  insertOptimisticTask,
  isLatestTaskMutation,
  reconcileOptimisticTask,
  removeOptimisticTask,
  updateOptimisticTask,
} from "@/lib/optimistic-tasks";
import {
  createTaskRequest,
  deleteTaskRequest,
  updateTaskRequest,
} from "@/lib/task-api";

import { useTaskStore } from "@/store/task";

import { NewTask, Task, TaskStatus, UpdateTask } from "@/types/task";

const LOG_SOURCE = "useTaskMutations";
export const TASKS_QUERY_KEY = ["tasks"] as const;

interface MutationContext {
  previousTasks: Task[];
  taskId: string;
  version: number;
}

interface CreateVariables {
  task: NewTask;
  optimisticId: string;
}

interface UpdateVariables {
  id: string;
  updates: UpdateTask;
}

function writeTasks(
  queryClient: ReturnType<typeof useQueryClient>,
  tasks: Task[]
) {
  queryClient.setQueryData(TASKS_QUERY_KEY, tasks);
  useTaskStore.setState({ tasks, error: null });
}

function mutationErrorMessage(action: string) {
  return `Could not ${action}. Your changes were reverted.`;
}

function reportMutationError(action: string, taskId: string, error: unknown) {
  const message = mutationErrorMessage(action);
  useTaskStore.setState({
    error: error instanceof Error ? error : new Error(message),
  });
  notify.error(message);
  void logger.error(
    `Optimistic task ${action} failed`,
    {
      taskId,
      error: error instanceof Error ? error.message : String(error),
    },
    LOG_SOURCE
  );
}

function scheduleInBackground(showProgress = false) {
  const toastId = showProgress
    ? notify.loading("Recalculating tasks...", {
        className: "recalc-toast",
        closeButton: true,
      })
    : undefined;

  void useTaskStore
    .getState()
    .triggerScheduleAllTasks()
    .catch((error: unknown) => {
      void logger.error(
        "Background rescheduling failed",
        {
          error: error instanceof Error ? error.message : String(error),
        },
        LOG_SOURCE
      );
    })
    .finally(() => {
      if (toastId) notify.dismiss(toastId);
    });
}

export function useTaskMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation<
    Task,
    unknown,
    CreateVariables,
    MutationContext
  >({
    mutationFn: ({ task, optimisticId }) =>
      enqueueTaskMutation(optimisticId, () => createTaskRequest(task)),
    onMutate: async ({ task, optimisticId }) => {
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY });
      const state = useTaskStore.getState();
      const previousTasks = state.tasks;
      const optimisticTask = buildOptimisticTask(
        task,
        state.tags,
        optimisticId
      );
      const version = beginTaskMutation(optimisticId);
      writeTasks(
        queryClient,
        insertOptimisticTask(previousTasks, optimisticTask)
      );
      return { previousTasks, taskId: optimisticId, version };
    },
    onError: (error, _variables, context) => {
      if (!context) return;
      if (isLatestTaskMutation(context.taskId, context.version)) {
        writeTasks(queryClient, context.previousTasks);
      }
      reportMutationError("create task", context.taskId, error);
    },
    onSuccess: (task, variables, context) => {
      if (context && isLatestTaskMutation(context.taskId, context.version)) {
        writeTasks(
          queryClient,
          reconcileOptimisticTask(
            useTaskStore.getState().tasks,
            task,
            variables.optimisticId
          )
        );
      }
      scheduleInBackground(true);
    },
  });

  const useUpdateMutation = (action: string) =>
    useMutation<Task, unknown, UpdateVariables, MutationContext>({
      mutationFn: ({ id, updates }) =>
        enqueueTaskMutation(id, () => updateTaskRequest(id, updates)),
      onMutate: async ({ id, updates }) => {
        await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY });
        const state = useTaskStore.getState();
        const previousTasks = state.tasks;
        const version = beginTaskMutation(id);
        writeTasks(
          queryClient,
          updateOptimisticTask(previousTasks, id, updates, state.tags)
        );
        return { previousTasks, taskId: id, version };
      },
      onError: (error, _variables, context) => {
        if (!context) return;
        if (isLatestTaskMutation(context.taskId, context.version)) {
          writeTasks(queryClient, context.previousTasks);
        }
        reportMutationError(action, context.taskId, error);
      },
      onSuccess: (task, variables, context) => {
        if (context && isLatestTaskMutation(context.taskId, context.version)) {
          const tasks = useTaskStore.getState().tasks;
          writeTasks(
            queryClient,
            variables.updates.isArchived !== undefined
              ? removeOptimisticTask(tasks, task.id)
              : reconcileOptimisticTask(tasks, task)
          );
        }
        scheduleInBackground();
      },
    });

  const updateMutation = useUpdateMutation("update task");
  const moveMutation = useUpdateMutation("move task");
  const completeMutation = useUpdateMutation("complete task");

  const deleteMutation = useMutation<void, unknown, string, MutationContext>({
    mutationFn: (id) => enqueueTaskMutation(id, () => deleteTaskRequest(id)),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY });
      const previousTasks = useTaskStore.getState().tasks;
      const version = beginTaskMutation(id);
      writeTasks(queryClient, removeOptimisticTask(previousTasks, id));
      return { previousTasks, taskId: id, version };
    },
    onError: (error, _id, context) => {
      if (!context) return;
      if (isLatestTaskMutation(context.taskId, context.version)) {
        writeTasks(queryClient, context.previousTasks);
      }
      reportMutationError("archive task", context.taskId, error);
    },
    onSuccess: (_result, _id, context) => {
      if (context && isLatestTaskMutation(context.taskId, context.version)) {
        writeTasks(
          queryClient,
          removeOptimisticTask(useTaskStore.getState().tasks, context.taskId)
        );
      }
      scheduleInBackground();
    },
  });

  const createTask = useCallback(
    (task: NewTask) =>
      createMutation.mutateAsync({
        task,
        optimisticId: createOptimisticTaskId(),
      }),
    [createMutation]
  );
  const updateTask = useCallback(
    (id: string, updates: UpdateTask) =>
      updateMutation.mutateAsync({ id, updates }),
    [updateMutation]
  );
  const moveTask = useCallback(
    (id: string, updates: UpdateTask) =>
      moveMutation.mutateAsync({ id, updates }),
    [moveMutation]
  );
  const completeTask = useCallback(
    (id: string, status: TaskStatus = TaskStatus.COMPLETED) =>
      completeMutation.mutateAsync({ id, updates: { status } }),
    [completeMutation]
  );
  const deleteTask = useCallback(
    (id: string) => deleteMutation.mutateAsync(id),
    [deleteMutation]
  );

  return {
    createTask,
    updateTask,
    moveTask,
    completeTask,
    deleteTask,
    isCreating: createMutation.isPending,
    isUpdating:
      updateMutation.isPending ||
      moveMutation.isPending ||
      completeMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
