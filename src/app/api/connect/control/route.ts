import { NextRequest, NextResponse } from "next/server";

import {
  authenticateConnectorToken,
  authorizeConnectorWorkspace,
} from "@/services/connectors/auth";
import { scheduleAllTasksForUser } from "@/services/scheduling/TaskSchedulingService";
import { WorkspaceKind, WorkspaceRole } from "@prisma/client";

import { APP_NAME } from "@/lib/app-config";
import { workspaceDataScopeWhere } from "@/lib/auth/workspace-auth";
import { newDate } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";

import { TaskStatus } from "@/types/task";

function forbidden() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function confirmationRequired() {
  return NextResponse.json(
    { error: "Set confirm: true to perform this destructive action." },
    { status: 400 }
  );
}

export async function POST(request: NextRequest) {
  const userId = await authenticateConnectorToken(
    request.headers.get("authorization")
  );
  if (!userId) return forbidden();

  const body = (await request.json()) as Record<string, unknown>;
  const action = body.action;
  const auth = await authorizeConnectorWorkspace(
    request,
    userId,
    action === "overview" ? WorkspaceRole.VIEWER : WorkspaceRole.EDITOR
  );
  if ("response" in auth) return auth.response;
  const { workspace } = auth;
  const scope = workspaceDataScopeWhere(workspace, userId);

  if (action === "overview") {
    const [tasks, projects, calendars, events] = await Promise.all([
      prisma.task.findMany({
        where: { ...scope, isArchived: false },
        orderBy: [{ scheduledStart: "asc" }, { createdAt: "desc" }],
      }),
      prisma.project.findMany({ where: scope, orderBy: { createdAt: "desc" } }),
      workspace.workspaceKind === WorkspaceKind.PERSONAL
        ? prisma.calendarFeed.findMany({
            where: { userId },
            orderBy: { createdAt: "asc" },
          })
        : Promise.resolve([]),
      workspace.workspaceKind === WorkspaceKind.PERSONAL
        ? prisma.calendarEvent.findMany({
            where: { feed: { userId } },
            orderBy: { start: "asc" },
            take: 100,
          })
        : Promise.resolve([]),
    ]);
    return NextResponse.json({
      generatedAt: newDate().toISOString(),
      tasks,
      projects,
      calendars,
      events,
    });
  }

  if (action === "create_project") {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const project = await prisma.project.create({
      data: {
        userId,
        workspaceId: workspace.workspaceId,
        name: body.name.trim(),
        description:
          typeof body.description === "string" ? body.description : null,
        color: typeof body.color === "string" ? body.color : null,
        icon: typeof body.icon === "string" ? body.icon : null,
      },
    });
    return NextResponse.json(project, { status: 201 });
  }

  if (action === "update_project") {
    if (typeof body.id !== "string")
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    const result = await prisma.project.updateMany({
      where: { id: body.id, ...scope },
      data: {
        ...(typeof body.name === "string" ? { name: body.name.trim() } : {}),
        ...(typeof body.description === "string"
          ? { description: body.description }
          : {}),
        ...(typeof body.color === "string" ? { color: body.color } : {}),
      },
    });
    if (!result.count)
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    return NextResponse.json(
      await prisma.project.findFirst({ where: { id: body.id, ...scope } })
    );
  }

  if (action === "update_task" || action === "complete_task") {
    if (typeof body.id !== "string")
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    if (typeof body.projectId === "string") {
      const project = await prisma.project.findFirst({
        where: { id: body.projectId, ...scope },
        select: { id: true },
      });
      if (!project) {
        return NextResponse.json(
          { error: "Project not found in the active workspace" },
          { status: 404 }
        );
      }
    }
    const data =
      action === "complete_task"
        ? { status: TaskStatus.COMPLETED, completedAt: newDate() }
        : {
            ...(typeof body.title === "string"
              ? { title: body.title.trim() }
              : {}),
            ...(typeof body.description === "string"
              ? { description: body.description }
              : {}),
            ...(typeof body.status === "string"
              ? { status: body.status as TaskStatus }
              : {}),
            ...(typeof body.projectId === "string" || body.projectId === null
              ? { projectId: body.projectId }
              : {}),
          };
    const result = await prisma.task.updateMany({
      where: { id: body.id, ...scope, isArchived: false },
      data,
    });
    if (!result.count)
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    await scheduleAllTasksForUser(userId);
    return NextResponse.json(
      await prisma.task.findFirst({
        where: { id: body.id, ...scope, isArchived: false },
      })
    );
  }

  const calendarAction =
    action === "create_calendar" ||
    action === "create_event" ||
    action === "update_event" ||
    action === "delete_event" ||
    action === "delete_calendar";
  if (calendarAction && workspace.workspaceKind !== WorkspaceKind.PERSONAL) {
    return NextResponse.json(
      {
        error:
          "Personal calendar actions are unavailable in shared workspaces.",
      },
      { status: 403 }
    );
  }

  if (action === "create_calendar") {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const calendar = await prisma.calendarFeed.create({
      data: {
        userId,
        name: body.name.trim(),
        type: "LOCAL",
        color: typeof body.color === "string" ? body.color : "#6366F1",
        enabled: true,
      },
    });
    return NextResponse.json(calendar, { status: 201 });
  }

  if (action === "create_event") {
    if (
      typeof body.title !== "string" ||
      typeof body.start !== "string" ||
      typeof body.end !== "string"
    ) {
      return NextResponse.json(
        { error: "title, start, and end are required" },
        { status: 400 }
      );
    }
    let feedId = typeof body.feedId === "string" ? body.feedId : undefined;
    if (!feedId) {
      const feed =
        (await prisma.calendarFeed.findFirst({
          where: { userId, type: "LOCAL" },
          orderBy: { createdAt: "asc" },
        })) ??
        (await prisma.calendarFeed.create({
          data: {
            userId,
            name: APP_NAME,
            type: "LOCAL",
            color: "#6366F1",
            enabled: true,
          },
        }));
      feedId = feed.id;
    }
    const ownedFeed = await prisma.calendarFeed.findFirst({
      where: { id: feedId, userId },
    });
    if (!ownedFeed)
      return NextResponse.json(
        { error: "Calendar not found" },
        { status: 404 }
      );
    const event = await prisma.calendarEvent.create({
      data: {
        feedId,
        title: body.title.trim(),
        start: newDate(body.start),
        end: newDate(body.end),
        description:
          typeof body.description === "string" ? body.description : null,
        location: typeof body.location === "string" ? body.location : null,
        allDay: body.allDay === true,
      },
    });
    return NextResponse.json(event, { status: 201 });
  }

  if (action === "update_event") {
    if (typeof body.id !== "string")
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    const result = await prisma.calendarEvent.updateMany({
      where: { id: body.id, feed: { userId } },
      data: {
        ...(typeof body.title === "string" ? { title: body.title.trim() } : {}),
        ...(typeof body.description === "string"
          ? { description: body.description }
          : {}),
        ...(typeof body.location === "string"
          ? { location: body.location }
          : {}),
        ...(typeof body.start === "string"
          ? { start: newDate(body.start) }
          : {}),
        ...(typeof body.end === "string" ? { end: newDate(body.end) } : {}),
      },
    });
    if (!result.count)
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    return NextResponse.json(
      await prisma.calendarEvent.findFirst({
        where: { id: body.id, feed: { userId } },
      })
    );
  }

  if (
    action === "delete_task" ||
    action === "delete_project" ||
    action === "delete_event" ||
    action === "delete_calendar"
  ) {
    if (body.confirm !== true) return confirmationRequired();
    if (typeof body.id !== "string")
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    const result =
      action === "delete_task"
        ? await prisma.task.deleteMany({ where: { id: body.id, ...scope } })
        : action === "delete_project"
          ? await prisma.project.deleteMany({
              where: { id: body.id, ...scope },
            })
          : action === "delete_event"
            ? await prisma.calendarEvent.deleteMany({
                where: { id: body.id, feed: { userId } },
              })
            : await prisma.calendarFeed.deleteMany({
                where: { id: body.id, userId },
              });
    return NextResponse.json({ deleted: result.count === 1 });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
