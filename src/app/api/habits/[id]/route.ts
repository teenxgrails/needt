import { NextRequest, NextResponse } from "next/server";

import { WorkspaceRole } from "@prisma/client";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { workspaceDataScopeWhere } from "@/lib/auth/workspace-auth";
import { newDate } from "@/lib/date-utils";
import { habitInputSchema } from "@/lib/habits";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "HabitAPI";
type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE, { requiredRole: WorkspaceRole.EDITOR });
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const existing = await prisma.habit.findFirst({
    where: { id, ...workspaceDataScopeWhere(auth.workspace, auth.userId), userId: auth.userId, archivedAt: null },
  });
  if (!existing) return NextResponse.json({ error: "Habit not found" }, { status: 404 });
  const parsed = habitInputSchema.partial().safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid habit" }, { status: 400 });
  const habit = await prisma.habit.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ habit });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE, { requiredRole: WorkspaceRole.EDITOR });
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const existing = await prisma.habit.findFirst({
    where: { id, ...workspaceDataScopeWhere(auth.workspace, auth.userId), userId: auth.userId, archivedAt: null },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Habit not found" }, { status: 404 });
  await prisma.habit.update({ where: { id }, data: { archivedAt: newDate(), isActive: false } });
  return new NextResponse(null, { status: 204 });
}
