import { newDate } from "@/lib/date-utils";
import { randomId } from "@/lib/uuid";

import { NewTask, Tag, Task, UpdateTask } from "@/types/task";

const OPTIMISTIC_ID_PREFIX = "optimistic-task:";

const mutationVersions = new Map<string, number>();
const mutationQueues = new Map<string, Promise<unknown>>();
let nextMutationVersion = 0;

export function createOptimisticTaskId() {
  return `${OPTIMISTIC_ID_PREFIX}${randomId()}`;
}

export function isOptimisticTaskId(id: string) {
  return id.startsWith(OPTIMISTIC_ID_PREFIX);
}

function resolveTags(tagIds: string[] | undefined, tags: Tag[]) {
  if (!tagIds) return [];
  const selected = new Set(tagIds);
  return tags.filter((tag) => selected.has(tag.id));
}

export function buildOptimisticTask(
  task: NewTask,
  availableTags: Tag[],
  id = createOptimisticTaskId(),
  now = newDate()
): Task {
  const { tagIds, ...taskFields } = task;

  return {
    ...taskFields,
    hardDeadline: taskFields.hardDeadline ?? false,
    availableFrom: taskFields.availableFrom ?? null,
    isArchived: false,
    archivedAt: null,
    id,
    tags: resolveTags(tagIds, availableTags),
    project: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function patchOptimisticTask(
  task: Task,
  updates: UpdateTask,
  availableTags: Tag[],
  now = newDate()
): Task {
  const { tagIds, ...taskFields } = updates;

  return {
    ...task,
    ...taskFields,
    tags: tagIds ? resolveTags(tagIds, availableTags) : task.tags,
    updatedAt: now,
  };
}

export function insertOptimisticTask(tasks: Task[], task: Task) {
  return [task, ...tasks.filter((candidate) => candidate.id !== task.id)];
}

export function updateOptimisticTask(
  tasks: Task[],
  id: string,
  updates: UpdateTask,
  availableTags: Tag[]
) {
  return tasks.map((task) =>
    task.id === id ? patchOptimisticTask(task, updates, availableTags) : task
  );
}

export function removeOptimisticTask(tasks: Task[], id: string) {
  return tasks.filter((task) => task.id !== id);
}

export function reconcileOptimisticTask(
  tasks: Task[],
  task: Task,
  optimisticId = task.id
) {
  const index = tasks.findIndex(
    (candidate) => candidate.id === optimisticId || candidate.id === task.id
  );
  const nextTasks = tasks.filter(
    (candidate) => candidate.id !== optimisticId && candidate.id !== task.id
  );
  nextTasks.splice(index < 0 ? 0 : index, 0, task);
  return nextTasks;
}

export function beginTaskMutation(taskId: string) {
  const version = ++nextMutationVersion;
  mutationVersions.set(taskId, version);
  return version;
}

export function isLatestTaskMutation(taskId: string, version: number) {
  return mutationVersions.get(taskId) === version;
}

export async function enqueueTaskMutation<T>(
  taskId: string,
  operation: () => Promise<T>
): Promise<T> {
  const previous = mutationQueues.get(taskId) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(operation);
  mutationQueues.set(taskId, current);

  try {
    return await current;
  } finally {
    if (mutationQueues.get(taskId) === current) {
      mutationQueues.delete(taskId);
    }
  }
}
