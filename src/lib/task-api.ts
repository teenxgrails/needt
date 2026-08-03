import { NewTask, Task, UpdateTask } from "@/types/task";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

export class TaskApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "TaskApiError";
  }
}

async function readError(response: Response, fallback: string) {
  const detail = (await response.text()).trim();
  return new TaskApiError(detail || fallback, response.status);
}

export async function createTaskRequest(task: NewTask): Promise<Task> {
  const response = await fetch("/api/tasks", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(task),
  });

  if (!response.ok) {
    throw await readError(response, "Failed to create task");
  }

  return response.json() as Promise<Task>;
}

export async function updateTaskRequest(
  id: string,
  updates: UpdateTask
): Promise<Task> {
  const response = await fetch(`/api/tasks/${id}`, {
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw await readError(response, "Failed to update task");
  }

  return response.json() as Promise<Task>;
}

export async function deleteTaskRequest(id: string): Promise<void> {
  const response = await fetch(`/api/tasks/${id}`, { method: "DELETE" });

  if (!response.ok) {
    throw await readError(response, "Failed to archive task");
  }
}
