import { NextRequest, NextResponse } from "next/server";

import {
  getConfiguredSchedulerAI,
  getEncryptedKeyForProvider,
} from "@/services/ai/settings";
import {
  AIChatMessage,
  AIChatRequest,
  AIChatToolCall,
  AIChatToolDefinition,
  SchedulerAI,
} from "@/services/ai/types";
import { scheduleAllTasksForUser } from "@/services/scheduling/TaskSchedulingService";
import { Prisma } from "@prisma/client";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "ai-chat";

type ToolResult = {
  text: string;
  toolName: string | null;
  toolPayload?: Prisma.InputJsonValue;
  requiresConfirm: boolean;
};

function titleFromMessage(message: string) {
  return message.trim().slice(0, 42) || "New chat";
}

function stringArg(args: Record<string, unknown>, key: string) {
  const value = args[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberArg(args: Record<string, unknown>, key: string) {
  const value = args[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function booleanArg(args: Record<string, unknown>, key: string) {
  const value = args[key];
  return typeof value === "boolean" ? value : null;
}

function dateArg(args: Record<string, unknown>, key: string) {
  const value = stringArg(args, key);
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function isDangerousTool(toolName: string) {
  return toolName === "delete_task" || toolName === "auto_schedule";
}

function buildSystemPrompt(soulPreset: string) {
  const tone =
    soulPreset === "coach"
      ? "Be warm, brief, and ADHD-friendly. Reduce friction and avoid shame."
      : "Be concise, direct, and businesslike.";

  return [
    "You are Flowday's single-user planner assistant.",
    tone,
    "Use tools when the user asks to create, edit, delete, schedule, parse, query, or manage planner data.",
    "Never claim a tool changed data unless the server tool result says it did.",
    "Dangerous tools require server confirmation; ask plainly when confirmation is needed.",
    "For ordinary chat, answer without inventing unavailable calendar details.",
  ].join(" ");
}

function toolDefinitions(settings: {
  allowParseTasks: boolean;
  allowFullAuto: boolean;
}): AIChatToolDefinition[] {
  const tools: AIChatToolDefinition[] = [
    {
      name: "create_task",
      description: "Create one planner task.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          estimatedMinutes: { type: "number" },
          priority: {
            type: "string",
            enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
          },
          dueDate: { type: "string", description: "ISO datetime if supplied." },
          autoSchedule: { type: "boolean" },
        },
        required: ["title"],
      },
    },
    {
      name: "edit_task",
      description: "Edit an existing task by id or exact title.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          taskId: { type: "string" },
          titleQuery: { type: "string" },
          title: { type: "string" },
          status: {
            type: "string",
            enum: ["todo", "in_progress", "completed"],
          },
          estimatedMinutes: { type: "number" },
          dueDate: { type: "string", description: "ISO datetime or empty." },
        },
      },
    },
    {
      name: "delete_task",
      description: "Delete a task by id or exact title. Requires confirmation.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          taskId: { type: "string" },
          titleQuery: { type: "string" },
        },
      },
    },
    {
      name: "query_schedule",
      description: "Read upcoming open tasks and scheduled blocks.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          limit: { type: "number" },
        },
      },
    },
    {
      name: "manage_projects",
      description: "List, create, update, or archive projects.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          action: {
            type: "string",
            enum: ["list", "create", "update", "archive"],
          },
          projectId: { type: "string" },
          name: { type: "string" },
          color: { type: "string" },
          icon: { type: "string" },
        },
        required: ["action"],
      },
    },
  ];

  if (settings.allowParseTasks) {
    tools.push({
      name: "parse_brain_dump",
      description:
        "Parse messy text into structured tasks without creating them.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          text: { type: "string" },
        },
        required: ["text"],
      },
    });
  }

  if (settings.allowFullAuto) {
    tools.push({
      name: "auto_schedule",
      description:
        "Run Flowday's deterministic scheduler for the current user. Requires confirmation.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          reason: { type: "string" },
        },
      },
    });
  }

  return tools;
}

async function findTask(userId: string, args: Record<string, unknown>) {
  const taskId = stringArg(args, "taskId");
  if (taskId) {
    return prisma.task.findFirst({ where: { id: taskId, userId } });
  }

  const titleQuery = stringArg(args, "titleQuery");
  if (!titleQuery) return null;
  return prisma.task.findFirst({
    where: {
      userId,
      title: { equals: titleQuery, mode: "insensitive" },
    },
  });
}

function fallbackToolFromMessage(message: string): AIChatToolCall | null {
  const lower = message.toLowerCase();

  const createMatch = message.match(
    /create (?:a )?task(?: called| named)? (.+)/i
  );
  if (createMatch?.[1]) {
    return {
      name: "create_task",
      arguments: {
        title: createMatch[1].replace(/[.!?]$/, "").slice(0, 160),
        autoSchedule: true,
      },
    };
  }

  if (lower.includes("schedule") || lower.includes("reschedule")) {
    return { name: "auto_schedule", arguments: { reason: message } };
  }

  if (lower.includes("what should i work on") || lower.includes("next")) {
    return { name: "query_schedule", arguments: { limit: 5 } };
  }

  return null;
}

async function executeTool(
  ai: SchedulerAI,
  call: AIChatToolCall,
  userId: string,
  confirmed: boolean
): Promise<ToolResult> {
  if (isDangerousTool(call.name) && !confirmed) {
    return {
      text: "This action can change or delete planner data. Confirm it to continue.",
      toolName: "confirmation_required",
      toolPayload: jsonValue({
        requestedTool: call.name,
        arguments: call.arguments,
      }),
      requiresConfirm: true,
    };
  }

  switch (call.name) {
    case "create_task": {
      const title = stringArg(call.arguments, "title");
      if (!title) {
        return {
          text: "I need a task title before I can create it.",
          toolName: "create_task",
          requiresConfirm: false,
        };
      }

      const estimatedMinutes = numberArg(call.arguments, "estimatedMinutes");
      const dueDate = dateArg(call.arguments, "dueDate");
      const autoSchedule = booleanArg(call.arguments, "autoSchedule") ?? true;
      const task = await prisma.task.create({
        data: {
          userId,
          title: title.slice(0, 160),
          status: "todo",
          isAutoScheduled: autoSchedule,
          autoScheduled: false,
          scheduleLocked: false,
          estimatedMinutes: estimatedMinutes
            ? Math.max(5, Math.round(estimatedMinutes))
            : undefined,
          duration: estimatedMinutes
            ? Math.max(5, Math.round(estimatedMinutes))
            : undefined,
          deadline: dueDate || undefined,
          dueDate: dueDate || undefined,
          priorityLevel:
            stringArg(call.arguments, "priority") === "URGENT"
              ? "URGENT"
              : stringArg(call.arguments, "priority") === "HIGH"
                ? "HIGH"
                : stringArg(call.arguments, "priority") === "LOW"
                  ? "LOW"
                  : "MEDIUM",
        },
      });

      return {
        text: `Created task "${task.title}".`,
        toolName: "create_task",
        toolPayload: jsonValue({ taskId: task.id, title: task.title }),
        requiresConfirm: false,
      };
    }

    case "edit_task": {
      const task = await findTask(userId, call.arguments);
      if (!task) {
        return {
          text: "I could not find that task to edit.",
          toolName: "edit_task",
          requiresConfirm: false,
        };
      }

      const title = stringArg(call.arguments, "title");
      const status = stringArg(call.arguments, "status");
      const estimatedMinutes = numberArg(call.arguments, "estimatedMinutes");
      const dueDate = dateArg(call.arguments, "dueDate");
      const updated = await prisma.task.update({
        where: { id: task.id },
        data: {
          ...(title ? { title: title.slice(0, 160) } : {}),
          ...(status === "todo" ||
          status === "in_progress" ||
          status === "completed"
            ? { status }
            : {}),
          ...(estimatedMinutes
            ? {
                estimatedMinutes: Math.max(5, Math.round(estimatedMinutes)),
                duration: Math.max(5, Math.round(estimatedMinutes)),
              }
            : {}),
          ...(dueDate ? { dueDate, deadline: dueDate } : {}),
        },
      });

      return {
        text: `Updated task "${updated.title}".`,
        toolName: "edit_task",
        toolPayload: jsonValue({ taskId: updated.id, title: updated.title }),
        requiresConfirm: false,
      };
    }

    case "delete_task": {
      const task = await findTask(userId, call.arguments);
      if (!task) {
        return {
          text: "I could not find that task to delete.",
          toolName: "delete_task",
          requiresConfirm: false,
        };
      }
      await prisma.task.delete({ where: { id: task.id } });
      return {
        text: `Deleted task "${task.title}".`,
        toolName: "delete_task",
        toolPayload: jsonValue({ taskId: task.id, title: task.title }),
        requiresConfirm: false,
      };
    }

    case "auto_schedule": {
      const tasks = await scheduleAllTasksForUser(userId);
      return {
        text: `Ran the deterministic auto-scheduler. ${tasks.length} tasks are now reflected in the planner response.`,
        toolName: "auto_schedule",
        toolPayload: jsonValue({ taskCount: tasks.length }),
        requiresConfirm: false,
      };
    }

    case "query_schedule": {
      const limit = Math.min(
        Math.max(numberArg(call.arguments, "limit") || 5, 1),
        12
      );
      const tasks = await prisma.task.findMany({
        where: { userId, status: { not: "completed" } },
        orderBy: [
          { scheduledStart: "asc" },
          { dueDate: "asc" },
          { createdAt: "desc" },
        ],
        take: limit,
        select: {
          id: true,
          title: true,
          scheduledStart: true,
          scheduledEnd: true,
          dueDate: true,
          priorityLevel: true,
        },
      });

      return {
        text: tasks.length
          ? `Upcoming work: ${tasks.map((task) => task.title).join(", ")}.`
          : "There are no open scheduled or due-date-prioritized tasks.",
        toolName: "query_schedule",
        toolPayload: jsonValue({ tasks }),
        requiresConfirm: false,
      };
    }

    case "manage_projects": {
      const action = stringArg(call.arguments, "action") || "list";
      if (action === "list") {
        const projects = await prisma.project.findMany({
          where: { userId, status: { not: "archived" } },
          orderBy: { updatedAt: "desc" },
          take: 12,
          select: {
            id: true,
            name: true,
            progress: true,
            color: true,
            icon: true,
          },
        });
        return {
          text: projects.length
            ? `Projects: ${projects.map((project) => project.name).join(", ")}.`
            : "No active projects yet.",
          toolName: "manage_projects",
          toolPayload: jsonValue({ action, projects }),
          requiresConfirm: false,
        };
      }

      if (action === "create") {
        const name = stringArg(call.arguments, "name");
        if (!name) {
          return {
            text: "I need a project name before I can create it.",
            toolName: "manage_projects",
            requiresConfirm: false,
          };
        }
        const project = await prisma.project.create({
          data: {
            userId,
            name: name.slice(0, 120),
            color: stringArg(call.arguments, "color"),
            icon: stringArg(call.arguments, "icon"),
          },
        });
        return {
          text: `Created project "${project.name}".`,
          toolName: "manage_projects",
          toolPayload: jsonValue({
            action,
            projectId: project.id,
            name: project.name,
          }),
          requiresConfirm: false,
        };
      }

      const projectId = stringArg(call.arguments, "projectId");
      if (!projectId) {
        return {
          text: "I need the project id for that project action.",
          toolName: "manage_projects",
          requiresConfirm: false,
        };
      }

      if (action === "archive") {
        const project = await prisma.project.findFirst({
          where: { id: projectId, userId },
        });
        if (!project) {
          return {
            text: "I could not find that project to archive.",
            toolName: "manage_projects",
            requiresConfirm: false,
          };
        }
        const archived = await prisma.project.update({
          where: { id: project.id },
          data: { status: "archived" },
        });
        return {
          text: `Archived project "${archived.name}".`,
          toolName: "manage_projects",
          toolPayload: jsonValue({ action, projectId: archived.id }),
          requiresConfirm: false,
        };
      }

      const existingProject = await prisma.project.findFirst({
        where: { id: projectId, userId },
      });
      if (!existingProject) {
        return {
          text: "I could not find that project to update.",
          toolName: "manage_projects",
          requiresConfirm: false,
        };
      }
      const project = await prisma.project.update({
        where: { id: existingProject.id },
        data: {
          ...(stringArg(call.arguments, "name")
            ? { name: stringArg(call.arguments, "name")?.slice(0, 120) }
            : {}),
          ...(stringArg(call.arguments, "color")
            ? { color: stringArg(call.arguments, "color") }
            : {}),
          ...(stringArg(call.arguments, "icon")
            ? { icon: stringArg(call.arguments, "icon") }
            : {}),
        },
      });
      return {
        text: `Updated project "${project.name}".`,
        toolName: "manage_projects",
        toolPayload: jsonValue({ action, projectId: project.id }),
        requiresConfirm: false,
      };
    }

    case "parse_brain_dump": {
      const text = stringArg(call.arguments, "text");
      if (!text) {
        return {
          text: "Paste the brain-dump text and I can structure it.",
          toolName: "parse_brain_dump",
          requiresConfirm: false,
        };
      }
      const parsed = await ai.parseTasks(text);
      return {
        text: parsed.length
          ? `Parsed ${parsed.length} tasks: ${parsed
              .map((task) => task.title)
              .join(", ")}.`
          : "I could not find any tasks in that brain dump.",
        toolName: "parse_brain_dump",
        toolPayload: jsonValue({ parsed }),
        requiresConfirm: false,
      };
    }

    default:
      return {
        text: "I can help with tasks, projects, calendar questions, and deterministic auto-scheduling.",
        toolName: null,
        requiresConfirm: false,
      };
  }
}

async function recentMessages(
  conversationId: string
): Promise<AIChatMessage[]> {
  const messages = await prisma.aiMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: 16,
  });

  return messages
    .reverse()
    .filter(
      (message) => message.role === "user" || message.role === "assistant"
    )
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content,
    }));
}

function streamText(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  text: string
) {
  for (const token of text.split(/(\s+)/)) {
    controller.enqueue(
      encoder.encode(JSON.stringify({ type: "token", value: token }) + "\n")
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;

  const { settings, ai } = await getConfiguredSchedulerAI(auth.userId);
  if (
    settings.provider === "NONE" ||
    !getEncryptedKeyForProvider(settings, settings.provider)
  ) {
    return NextResponse.json(
      { error: "Connect an AI provider key before using chat." },
      { status: 409 }
    );
  }

  const body = await request.json();
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const confirmed = Boolean(body.confirmed);
  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const conversation =
    typeof body.conversationId === "string" && body.conversationId
      ? await prisma.aiConversation.findFirst({
          where: { id: body.conversationId, userId: auth.userId },
        })
      : await prisma.aiConversation.create({
          data: { userId: auth.userId, title: titleFromMessage(message) },
        });

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  await prisma.aiMessage.create({
    data: {
      conversationId: conversation.id,
      userId: auth.userId,
      role: "user",
      content: message,
    },
  });

  const history = await recentMessages(conversation.id);
  const systemPrompt = buildSystemPrompt(settings.soulPreset);
  const tools = toolDefinitions(settings);
  const chatRequest: AIChatRequest = {
    systemPrompt,
    messages: history,
    tools,
  };

  let toolResult: ToolResult | null = null;
  let selectedTool: AIChatToolCall | null = null;
  try {
    selectedTool = (await ai.selectChatTool?.(chatRequest)) || null;
  } catch {
    selectedTool = fallbackToolFromMessage(message);
  }

  if (!selectedTool) {
    selectedTool = fallbackToolFromMessage(message);
  }

  if (selectedTool && tools.some((tool) => tool.name === selectedTool?.name)) {
    toolResult = await executeTool(ai, selectedTool, auth.userId, confirmed);
  }

  const finalRequest: AIChatRequest = {
    systemPrompt,
    messages: toolResult
      ? [
          ...history,
          {
            role: "assistant",
            content: `Server tool result (${toolResult.toolName}): ${toolResult.text}`,
          },
        ]
      : history,
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let assistantText = "";

      controller.enqueue(
        encoder.encode(
          JSON.stringify({
            type: "meta",
            conversationId: conversation.id,
            requiresConfirm: toolResult?.requiresConfirm || false,
            toolName: toolResult?.toolName || null,
            toolPayload: toolResult?.toolPayload || null,
          }) + "\n"
        )
      );

      try {
        if (toolResult?.requiresConfirm) {
          assistantText = toolResult.text;
          streamText(controller, encoder, assistantText);
        } else if (ai.streamChat) {
          for await (const token of ai.streamChat(finalRequest)) {
            assistantText += token;
            controller.enqueue(
              encoder.encode(
                JSON.stringify({ type: "token", value: token }) + "\n"
              )
            );
          }
        }

        if (!assistantText.trim()) {
          assistantText =
            toolResult?.text ||
            "I handled the request, but the provider returned no text.";
          streamText(controller, encoder, assistantText);
        }
      } catch {
        assistantText =
          toolResult?.text ||
          "I could not reach the AI provider. No planner changes were made.";
        streamText(controller, encoder, assistantText);
      }

      await prisma.aiMessage.create({
        data: {
          conversationId: conversation.id,
          userId: auth.userId,
          role: "assistant",
          content: assistantText,
          toolName: toolResult?.toolName,
          toolPayload: toolResult?.toolPayload,
          requiresConfirm: toolResult?.requiresConfirm || false,
        },
      });
      await prisma.aiConversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
