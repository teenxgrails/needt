import { NextRequest, NextResponse } from "next/server";

import { buildAgentPromptForUser } from "@/services/ai/context";
import {
  forgetForUser,
  listAgentMemories,
  rememberForUser,
} from "@/services/ai/memory";
import { createReschedulePreview } from "@/services/ai/reschedule-preview";
import { getConfiguredSchedulerAI } from "@/services/ai/settings";
import {
  getAgentToolDefinitions,
  isDangerousAgentTool,
  validateAgentToolCall,
} from "@/services/ai/tool-catalog";
import {
  AIChatMessage,
  AIChatRequest,
  AIChatToolCall,
  SchedulerAI,
} from "@/services/ai/types";
import { recordHostedAiAction } from "@/services/ai/usage";
import {
  createBoard,
  createColumn,
  getBoard,
  listBoards,
  moveCard,
} from "@/services/boards/boardService";
import {
  finalizeSession,
  getActiveSession,
  startSession,
} from "@/services/focus/focusSession";
import { getWeeklyFocusReport } from "@/services/focus/focusStats";
import { FocusSessionMode, Prisma } from "@prisma/client";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { getMailMessage } from "@/lib/mail-db";
import { prisma } from "@/lib/prisma";
import { publishRealtimeEvent } from "@/lib/realtime/publish";

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
  const date = newDate(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function publishAgentMutation(userId: string) {
  try {
    await publishRealtimeEvent(userId, "tasks-updated");
  } catch (error) {
    logger.warn(
      "Could not publish AI mutation realtime event",
      { userId, error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
  }
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
  const validatedArguments = validateAgentToolCall(call.name, call.arguments);
  if (!validatedArguments) {
    return {
      text: "The tool request was invalid, so no planner data was changed.",
      toolName: call.name,
      requiresConfirm: false,
    };
  }
  call = { ...call, arguments: validatedArguments };

  logger.info(
    "Executing AI agent tool",
    { userId, toolName: call.name, confirmed },
    LOG_SOURCE
  );

  if (isDangerousAgentTool(call.name, call.arguments) && !confirmed) {
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
      await publishAgentMutation(userId);

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
      await publishAgentMutation(userId);

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
      await publishAgentMutation(userId);
      return {
        text: `Deleted task "${task.title}".`,
        toolName: "delete_task",
        toolPayload: jsonValue({ taskId: task.id, title: task.title }),
        requiresConfirm: false,
      };
    }

    case "auto_schedule": {
      const preview = await createReschedulePreview(userId);
      return {
        text: preview.changes.length
          ? `Prepared a dry-run with ${preview.changes.length} schedule changes. Review the diff, then choose Apply or Cancel.`
          : "The dry-run found no schedule changes to apply.",
        toolName: "auto_schedule",
        toolPayload: jsonValue(preview),
        requiresConfirm: false,
      };
    }

    case "list_boards": {
      const boards = await listBoards(userId);
      return {
        text: boards.length
          ? `Boards: ${boards.map((board) => board.name).join(", ")}.`
          : "No boards yet.",
        toolName: call.name,
        toolPayload: jsonValue({ boards }),
        requiresConfirm: false,
      };
    }

    case "query_board": {
      const boardId = stringArg(call.arguments, "boardId");
      const board = boardId ? await getBoard(userId, boardId) : null;
      return {
        text: board
          ? `${board.name} has ${board.columns.length} columns and ${board.tasks.length} cards.`
          : "I could not find that board.",
        toolName: call.name,
        toolPayload: jsonValue({ board }),
        requiresConfirm: false,
      };
    }

    case "create_board": {
      const name = stringArg(call.arguments, "name");
      const columns = Array.isArray(call.arguments.columns)
        ? call.arguments.columns.filter(
            (value): value is string => typeof value === "string"
          )
        : undefined;
      if (!name) {
        return {
          text: "I need a board name.",
          toolName: call.name,
          requiresConfirm: false,
        };
      }
      const board = await createBoard(userId, {
        name,
        icon: stringArg(call.arguments, "icon"),
        columns,
      });
      return {
        text: `Created board "${board.name}".`,
        toolName: call.name,
        toolPayload: jsonValue({ boardId: board.id, columns: board.columns }),
        requiresConfirm: false,
      };
    }

    case "create_column": {
      const boardId = stringArg(call.arguments, "boardId");
      const name = stringArg(call.arguments, "name");
      const column =
        boardId && name
          ? await createColumn(userId, boardId, {
              name,
              color: stringArg(call.arguments, "color"),
            })
          : null;
      return {
        text: column
          ? `Created column "${column.name}".`
          : "I could not create that column.",
        toolName: call.name,
        toolPayload: jsonValue({ column }),
        requiresConfirm: false,
      };
    }

    case "move_card": {
      const moved = await moveCard(userId, {
        taskId: stringArg(call.arguments, "taskId") || "",
        boardId: stringArg(call.arguments, "boardId") || "",
        columnId: stringArg(call.arguments, "columnId") || "",
        toIndex: numberArg(call.arguments, "toIndex") || 0,
      });
      if (moved) await publishAgentMutation(userId);
      return {
        text: moved
          ? `Moved card "${moved.title}".`
          : "I could not move that card.",
        toolName: call.name,
        toolPayload: jsonValue({ taskId: moved?.id || null }),
        requiresConfirm: false,
      };
    }

    case "start_focus_session": {
      const taskId = stringArg(call.arguments, "taskId");
      if (
        taskId &&
        !(await prisma.task.findFirst({ where: { id: taskId, userId } }))
      ) {
        return {
          text: "I could not find that task for this focus session.",
          toolName: call.name,
          requiresConfirm: false,
        };
      }
      const session = await startSession({
        userId,
        taskId,
        mode: (stringArg(call.arguments, "mode") ||
          "POMODORO") as FocusSessionMode,
        plannedMinutes: numberArg(call.arguments, "plannedMinutes"),
        source: "ai-agent",
      });
      return {
        text: `Started a ${session.mode.toLowerCase().replace(/_/g, " ")} focus session.`,
        toolName: call.name,
        toolPayload: jsonValue({ sessionId: session.id }),
        requiresConfirm: false,
      };
    }

    case "stop_focus_session": {
      const active = await getActiveSession(userId);
      const sessionId = stringArg(call.arguments, "sessionId") || active?.id;
      const session = sessionId
        ? await finalizeSession({
            userId,
            sessionId,
            completed: booleanArg(call.arguments, "completed") ?? true,
            markTaskDone: booleanArg(call.arguments, "markTaskDone") ?? false,
          })
        : null;
      return {
        text: session
          ? `Stopped the focus session after ${session.elapsedMinutes} minutes.`
          : "There is no active focus session to stop.",
        toolName: call.name,
        toolPayload: jsonValue({ sessionId: session?.id || null }),
        requiresConfirm: false,
      };
    }

    case "get_focus_stats": {
      const report = await getWeeklyFocusReport(userId);
      return {
        text: `This week: ${report.focusMinutes} focused minutes across ${report.sessionsCompleted} completed sessions.`,
        toolName: call.name,
        toolPayload: jsonValue(report),
        requiresConfirm: false,
      };
    }

    case "search_mail": {
      const query = stringArg(call.arguments, "query") || "";
      const limit = Math.min(numberArg(call.arguments, "limit") || 8, 20);
      const messages = await prisma.mailMessage.findMany({
        where: {
          account: { userId },
          isArchived: false,
          OR: [
            { subject: { contains: query, mode: "insensitive" } },
            { snippet: { contains: query, mode: "insensitive" } },
            { fromName: { contains: query, mode: "insensitive" } },
            { fromAddress: { contains: query, mode: "insensitive" } },
          ],
        },
        orderBy: { date: "desc" },
        take: limit,
        select: {
          id: true,
          subject: true,
          fromName: true,
          fromAddress: true,
          snippet: true,
          date: true,
          isRead: true,
        },
      });
      return {
        text: messages.length
          ? messages
              .map(
                (message) =>
                  `${message.subject} — ${message.fromName || message.fromAddress || "unknown sender"}`
              )
              .join("; ")
          : "No synced mail matched that search.",
        toolName: call.name,
        toolPayload: jsonValue({ messages }),
        requiresConfirm: false,
      };
    }

    case "get_message": {
      const messageId = stringArg(call.arguments, "messageId");
      const message = messageId
        ? await getMailMessage(userId, messageId)
        : null;
      const body = (message?.bodyHtml || message?.snippet || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 4_000);
      return {
        text: message
          ? `From ${message.fromName || message.fromAddress || "unknown sender"}: ${message.subject}. ${body}`
          : "I could not find that synced message.",
        toolName: call.name,
        toolPayload: jsonValue(
          message
            ? {
                id: message.id,
                subject: message.subject,
                fromName: message.fromName,
                fromAddress: message.fromAddress,
                date: message.date,
              }
            : null
        ),
        requiresConfirm: false,
      };
    }

    case "create_task_from_email": {
      const messageId = stringArg(call.arguments, "messageId");
      const message = messageId
        ? await getMailMessage(userId, messageId)
        : null;
      if (!message) {
        return {
          text: "I could not find that synced message.",
          toolName: call.name,
          requiresConfirm: false,
        };
      }
      const minutes = numberArg(call.arguments, "estimatedMinutes");
      const task = await prisma.task.create({
        data: {
          userId,
          title:
            stringArg(call.arguments, "title")?.slice(0, 160) ||
            `Follow up: ${message.subject}`.slice(0, 160),
          description: `From ${message.fromName || message.fromAddress || "unknown sender"}\n\n${message.snippet}`,
          status: "todo",
          source: "mail",
          estimatedMinutes: minutes ? Math.round(minutes) : undefined,
          duration: minutes ? Math.round(minutes) : undefined,
          isAutoScheduled: true,
        },
      });
      await publishAgentMutation(userId);
      return {
        text: `Created task "${task.title}" from the email.`,
        toolName: call.name,
        toolPayload: jsonValue({ taskId: task.id, messageId: message.id }),
        requiresConfirm: false,
      };
    }

    case "get_user_settings": {
      const preferences = await prisma.schedulingPreferences.findUnique({
        where: { userId },
      });
      return {
        text: preferences
          ? `Work hours and scheduling preferences are available in the tool result.`
          : "Scheduling preferences have not been configured yet.",
        toolName: call.name,
        toolPayload: jsonValue({ preferences }),
        requiresConfirm: false,
      };
    }

    case "update_work_hours": {
      const workHours = call.arguments.workHours as Prisma.InputJsonValue;
      const preferences = await prisma.schedulingPreferences.upsert({
        where: { userId },
        create: { userId, workHours },
        update: { workHours },
      });
      return {
        text: "Updated work hours.",
        toolName: call.name,
        toolPayload: jsonValue({ workHours: preferences.workHours }),
        requiresConfirm: false,
      };
    }

    case "update_scheduling_preferences": {
      const allowed = [
        "bufferMinutes",
        "maxDeepWorkPerDay",
        "minBreakMinutes",
        "autoRescheduleOnMiss",
        "enableBodyDoubling",
        "enableTaskBatching",
        "hardStopTime",
        "bufferMultiplier",
      ] as const;
      const data = Object.fromEntries(
        allowed
          .filter((key) => call.arguments[key] !== undefined)
          .map((key) => [key, call.arguments[key]])
      ) as Prisma.SchedulingPreferencesUncheckedUpdateInput;
      await prisma.schedulingPreferences.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });
      const preferences = await prisma.schedulingPreferences.update({
        where: { userId },
        data,
      });
      return {
        text: "Updated scheduling preferences.",
        toolName: call.name,
        toolPayload: jsonValue({ preferences }),
        requiresConfirm: false,
      };
    }

    case "remember": {
      const content = stringArg(call.arguments, "content") || "";
      if (
        /(password|api[- ]?key|secret|token|credit card|bank|diagnos|medication|health)/i.test(
          content
        )
      ) {
        return {
          text: "I did not save that because assistant memory excludes sensitive information.",
          toolName: call.name,
          requiresConfirm: false,
        };
      }
      const memory = await rememberForUser(userId, {
        kind: stringArg(call.arguments, "kind") as
          | "preference"
          | "pattern"
          | "goal"
          | "fact",
        content,
        weight: numberArg(call.arguments, "weight") || 1,
        source: "chat",
      });
      return {
        text: "Remembered.",
        toolName: call.name,
        toolPayload: jsonValue({ memoryId: memory.id }),
        requiresConfirm: false,
      };
    }

    case "forget": {
      const memoryId = stringArg(call.arguments, "memoryId") || "";
      const forgotten = await forgetForUser(userId, memoryId);
      return {
        text: forgotten
          ? "Forgot that memory."
          : "I could not find that memory.",
        toolName: call.name,
        requiresConfirm: false,
      };
    }

    case "list_memories": {
      const memories = await listAgentMemories(userId);
      return {
        text: memories.length
          ? memories
              .map((memory) => `${memory.kind}: ${memory.content}`)
              .join("; ")
          : "No assistant memories are saved.",
        toolName: call.name,
        toolPayload: jsonValue({ memories }),
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

  const { settings, ai, source, usage } = await getConfiguredSchedulerAI(
    auth.userId
  );
  if (source === "none") {
    const upgradeRequired = usage.plan === "FREE";
    return NextResponse.json(
      {
        error: upgradeRequired
          ? "The AI agent is available on Needt Pro and Lifetime."
          : usage.allowed
            ? "Hosted AI is unavailable. Add your own provider key in Settings."
            : "Monthly hosted AI limit reached. Add your own provider key for unlimited actions.",
        code: upgradeRequired
          ? "UPGRADE_REQUIRED"
          : usage.allowed
            ? "AI_UNAVAILABLE"
            : "HOSTED_LIMIT_REACHED",
        upgradeRequired,
        usage,
      },
      { status: upgradeRequired ? 403 : 409 }
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
  if (source === "hosted") {
    await recordHostedAiAction(auth.userId);
  }
  const systemPrompt = await buildAgentPromptForUser(
    auth.userId,
    settings.soulPreset
  );
  const tools = getAgentToolDefinitions(settings);
  const chatRequest: AIChatRequest = {
    systemPrompt,
    messages: history,
    tools,
  };

  let toolResult: ToolResult | null = null;
  let selectedTool: AIChatToolCall | null = null;
  try {
    selectedTool = (await ai.selectChatTool?.(chatRequest)) || null;
  } catch (error) {
    logger.warn(
      "AI tool selection failed; using local fallback",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
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
        data: { updatedAt: newDate() },
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
