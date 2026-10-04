import { NextRequest, NextResponse } from "next/server";

import { WorkspaceRole } from "@prisma/client";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { formatInTimeZone, newDate } from "@/lib/date-utils";
import { normalizeUserTimeZone } from "@/lib/habit-completion-date";
import { prismaDataSource } from "@/lib/needt/prisma-source";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "NeedtWorkspaceAPI";
const NO_STORE = { "Cache-Control": "private, no-store, max-age=0" } as const;

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  if (!auth.workspace) {
    return NextResponse.json(
      { error: "Workspace unavailable" },
      { status: 500, headers: NO_STORE }
    );
  }

  const now = newDate();
  const source = prismaDataSource(auth.userId, auth.workspace, () => now);
  const [tasks, projects, people, stages, settings] = await Promise.all([
    source.getTasks(),
    source.getProjects(),
    source.getPeople(),
    source.getStages(),
    prisma.userSettings.findUnique({
      where: { userId: auth.userId },
      select: { timeZone: true },
    }),
  ]);
  const timeZone = normalizeUserTimeZone(settings?.timeZone);

  return NextResponse.json(
    {
      workspaceId: auth.workspace.workspaceId,
      now: now.toISOString(),
      todayKey: formatInTimeZone(now, timeZone, "yyyy-MM-dd"),
      tasks,
      projects,
      people,
      stages,
      canEdit: auth.workspace.role !== WorkspaceRole.VIEWER,
    },
    { headers: NO_STORE }
  );
}
