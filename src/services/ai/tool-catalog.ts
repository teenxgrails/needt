import { z } from "zod";

import { AIChatToolDefinition } from "./types";

type ToolEntry = {
  definition: AIChatToolDefinition;
  schema: z.ZodType<Record<string, unknown>>;
  dangerous?: boolean;
};

const object = <Shape extends z.ZodRawShape>(shape: Shape) =>
  z.object(shape).strict();
const taskRef = {
  taskId: z.string().min(1).optional(),
  titleQuery: z.string().min(1).optional(),
};
const jsonObject = (
  properties: Record<string, unknown>,
  required?: string[]
) => ({
  type: "object",
  additionalProperties: false,
  properties,
  ...(required ? { required } : {}),
});

export const AGENT_TOOL_CATALOG: Record<string, ToolEntry> = {
  create_task: {
    schema: object({
      title: z.string().min(1).max(160),
      estimatedMinutes: z.number().min(5).max(1440).optional(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
      dueDate: z.string().optional(),
      autoSchedule: z.boolean().optional(),
    }),
    definition: {
      name: "create_task",
      description: "Create one planner task.",
      parameters: jsonObject(
        {
          title: { type: "string" },
          estimatedMinutes: { type: "number" },
          priority: {
            type: "string",
            enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
          },
          dueDate: { type: "string" },
          autoSchedule: { type: "boolean" },
        },
        ["title"]
      ),
    },
  },
  edit_task: {
    dangerous: true,
    schema: object({
      ...taskRef,
      title: z.string().min(1).max(160).optional(),
      status: z.enum(["todo", "in_progress", "completed"]).optional(),
      estimatedMinutes: z.number().min(5).max(1440).optional(),
      dueDate: z.string().optional(),
    }),
    definition: {
      name: "edit_task",
      description: "Edit a task by id or exact title. Requires confirmation.",
      parameters: jsonObject({
        taskId: { type: "string" },
        titleQuery: { type: "string" },
        title: { type: "string" },
        status: { type: "string", enum: ["todo", "in_progress", "completed"] },
        estimatedMinutes: { type: "number" },
        dueDate: { type: "string" },
      }),
    },
  },
  delete_task: {
    dangerous: true,
    schema: object(taskRef),
    definition: {
      name: "delete_task",
      description: "Delete a task by id or exact title. Requires confirmation.",
      parameters: jsonObject({
        taskId: { type: "string" },
        titleQuery: { type: "string" },
      }),
    },
  },
  query_schedule: {
    schema: object({ limit: z.number().int().min(1).max(12).optional() }),
    definition: {
      name: "query_schedule",
      description: "Read upcoming open tasks and scheduled blocks.",
      parameters: jsonObject({ limit: { type: "number" } }),
    },
  },
  manage_projects: {
    dangerous: true,
    schema: object({
      action: z.enum(["list", "create", "update", "archive"]),
      projectId: z.string().optional(),
      name: z.string().optional(),
      color: z.string().optional(),
      icon: z.string().optional(),
    }),
    definition: {
      name: "manage_projects",
      description:
        "List, create, update, or archive projects. Mutations require confirmation.",
      parameters: jsonObject(
        {
          action: {
            type: "string",
            enum: ["list", "create", "update", "archive"],
          },
          projectId: { type: "string" },
          name: { type: "string" },
          color: { type: "string" },
          icon: { type: "string" },
        },
        ["action"]
      ),
    },
  },
  parse_brain_dump: {
    schema: object({ text: z.string().min(1).max(10_000) }),
    definition: {
      name: "parse_brain_dump",
      description:
        "Parse messy text into structured tasks without creating them.",
      parameters: jsonObject({ text: { type: "string" } }, ["text"]),
    },
  },
  auto_schedule: {
    dangerous: true,
    schema: object({ reason: z.string().optional() }),
    definition: {
      name: "auto_schedule",
      description:
        "Preview deterministic schedule changes. Requires confirmation before preview.",
      parameters: jsonObject({ reason: { type: "string" } }),
    },
  },
  list_boards: {
    schema: object({}),
    definition: {
      name: "list_boards",
      description: "List boards and columns.",
      parameters: jsonObject({}),
    },
  },
  query_board: {
    schema: object({ boardId: z.string().min(1) }),
    definition: {
      name: "query_board",
      description: "Read a board and its cards.",
      parameters: jsonObject({ boardId: { type: "string" } }, ["boardId"]),
    },
  },
  create_board: {
    schema: object({
      name: z.string().min(1).max(120),
      icon: z.string().optional(),
      columns: z.array(z.string()).max(20).optional(),
    }),
    definition: {
      name: "create_board",
      description: "Create a board.",
      parameters: jsonObject(
        {
          name: { type: "string" },
          icon: { type: "string" },
          columns: { type: "array", items: { type: "string" } },
        },
        ["name"]
      ),
    },
  },
  create_column: {
    schema: object({
      boardId: z.string().min(1),
      name: z.string().min(1).max(120),
      color: z.string().optional(),
    }),
    definition: {
      name: "create_column",
      description: "Create a board column.",
      parameters: jsonObject(
        {
          boardId: { type: "string" },
          name: { type: "string" },
          color: { type: "string" },
        },
        ["boardId", "name"]
      ),
    },
  },
  move_card: {
    dangerous: true,
    schema: object({
      taskId: z.string(),
      boardId: z.string(),
      columnId: z.string(),
      toIndex: z.number().int().min(0),
    }),
    definition: {
      name: "move_card",
      description: "Move a task card to a board column. Requires confirmation.",
      parameters: jsonObject(
        {
          taskId: { type: "string" },
          boardId: { type: "string" },
          columnId: { type: "string" },
          toIndex: { type: "number" },
        },
        ["taskId", "boardId", "columnId", "toIndex"]
      ),
    },
  },
  start_focus_session: {
    schema: object({
      taskId: z.string().optional(),
      mode: z.enum(["POMODORO", "FLOW", "DEEP_FOCUS"]).default("POMODORO"),
      plannedMinutes: z.number().int().min(1).max(480).optional(),
    }),
    definition: {
      name: "start_focus_session",
      description: "Start a persistent focus session.",
      parameters: jsonObject({
        taskId: { type: "string" },
        mode: { type: "string", enum: ["POMODORO", "FLOW", "DEEP_FOCUS"] },
        plannedMinutes: { type: "number" },
      }),
    },
  },
  stop_focus_session: {
    dangerous: true,
    schema: object({
      sessionId: z.string().optional(),
      completed: z.boolean().default(true),
      markTaskDone: z.boolean().optional(),
    }),
    definition: {
      name: "stop_focus_session",
      description: "Stop the active focus session. Requires confirmation.",
      parameters: jsonObject({
        sessionId: { type: "string" },
        completed: { type: "boolean" },
        markTaskDone: { type: "boolean" },
      }),
    },
  },
  get_focus_stats: {
    schema: object({}),
    definition: {
      name: "get_focus_stats",
      description: "Read the weekly focus report.",
      parameters: jsonObject({}),
    },
  },
  search_mail: {
    schema: object({
      query: z.string().min(1).max(200),
      limit: z.number().int().min(1).max(20).optional(),
    }),
    definition: {
      name: "search_mail",
      description: "Search local synced mail read-only.",
      parameters: jsonObject(
        { query: { type: "string" }, limit: { type: "number" } },
        ["query"]
      ),
    },
  },
  get_message: {
    schema: object({ messageId: z.string().min(1) }),
    definition: {
      name: "get_message",
      description: "Read one locally synced mail message. Never sends mail.",
      parameters: jsonObject({ messageId: { type: "string" } }, ["messageId"]),
    },
  },
  create_task_from_email: {
    schema: object({
      messageId: z.string().min(1),
      title: z.string().max(160).optional(),
      estimatedMinutes: z.number().int().min(5).max(1440).optional(),
    }),
    definition: {
      name: "create_task_from_email",
      description: "Create a planner task from a synced email.",
      parameters: jsonObject(
        {
          messageId: { type: "string" },
          title: { type: "string" },
          estimatedMinutes: { type: "number" },
        },
        ["messageId"]
      ),
    },
  },
  get_user_settings: {
    schema: object({}),
    definition: {
      name: "get_user_settings",
      description: "Read work hours and scheduling preferences.",
      parameters: jsonObject({}),
    },
  },
  update_work_hours: {
    dangerous: true,
    schema: object({
      workHours: z.record(
        z.object({
          start: z.string().regex(/^\\d{2}:\\d{2}$/),
          end: z.string().regex(/^\\d{2}:\\d{2}$/),
        })
      ),
    }),
    definition: {
      name: "update_work_hours",
      description: "Update weekly work hours. Requires confirmation.",
      parameters: jsonObject({ workHours: { type: "object" } }, ["workHours"]),
    },
  },
  update_scheduling_preferences: {
    dangerous: true,
    schema: object({
      bufferMinutes: z.number().int().min(0).max(180).optional(),
      maxDeepWorkPerDay: z.number().int().min(0).max(1440).optional(),
      minBreakMinutes: z.number().int().min(0).max(180).optional(),
      autoRescheduleOnMiss: z.boolean().optional(),
      enableBodyDoubling: z.boolean().optional(),
      enableTaskBatching: z.boolean().optional(),
      hardStopTime: z
        .string()
        .regex(/^\\d{2}:\\d{2}$/)
        .optional(),
      bufferMultiplier: z.number().min(1).max(3).optional(),
    }),
    definition: {
      name: "update_scheduling_preferences",
      description: "Update scheduling preferences. Requires confirmation.",
      parameters: jsonObject({
        bufferMinutes: { type: "number" },
        maxDeepWorkPerDay: { type: "number" },
        minBreakMinutes: { type: "number" },
        autoRescheduleOnMiss: { type: "boolean" },
        enableBodyDoubling: { type: "boolean" },
        enableTaskBatching: { type: "boolean" },
        hardStopTime: { type: "string" },
        bufferMultiplier: { type: "number" },
      }),
    },
  },
  remember: {
    schema: object({
      kind: z.enum(["preference", "pattern", "goal", "fact"]),
      content: z.string().min(3).max(500),
      weight: z.number().min(0.1).max(10).optional(),
    }),
    definition: {
      name: "remember",
      description:
        "Remember a non-sensitive durable user preference, pattern, goal, or fact.",
      parameters: jsonObject(
        {
          kind: {
            type: "string",
            enum: ["preference", "pattern", "goal", "fact"],
          },
          content: { type: "string" },
          weight: { type: "number" },
        },
        ["kind", "content"]
      ),
    },
  },
  forget: {
    dangerous: true,
    schema: object({ memoryId: z.string().min(1) }),
    definition: {
      name: "forget",
      description: "Forget one memory. Requires confirmation.",
      parameters: jsonObject({ memoryId: { type: "string" } }, ["memoryId"]),
    },
  },
  list_memories: {
    schema: object({}),
    definition: {
      name: "list_memories",
      description: "List saved assistant memories.",
      parameters: jsonObject({}),
    },
  },
};

export function getAgentToolDefinitions(settings: {
  allowParseTasks: boolean;
  allowFullAuto: boolean;
}) {
  return Object.values(AGENT_TOOL_CATALOG)
    .filter(
      ({ definition }) =>
        settings.allowParseTasks || definition.name !== "parse_brain_dump"
    )
    .filter(
      ({ definition }) =>
        settings.allowFullAuto || definition.name !== "auto_schedule"
    )
    .map(({ definition }) => definition);
}

export function validateAgentToolCall(name: string, args: unknown) {
  const entry = AGENT_TOOL_CATALOG[name];
  if (!entry) return null;
  const result = entry.schema.safeParse(args);
  return result.success ? result.data : null;
}

export function isDangerousAgentTool(
  name: string,
  args?: Record<string, unknown>
) {
  if (name === "manage_projects" && args?.action === "list") return false;
  return Boolean(AGENT_TOOL_CATALOG[name]?.dangerous);
}
