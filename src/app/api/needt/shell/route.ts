import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { newDate } from "@/lib/date-utils";
import { prismaDataSource } from "@/lib/needt/prisma-source";

const LOG_SOURCE = "NeedtShellAPI";
const NO_STORE = { "Cache-Control": "private, no-store, max-age=0" } as const;

/** How many starred documents the rail shows before it stops. */
const PINNED_LIMIT = 8;

/**
 * Everything the application shell draws, and nothing a screen draws.
 *
 * The shell is mounted around every page, so this is on the path of every
 * navigation. It stays deliberately small: the task rail, the faces, the
 * starred documents. A screen asks for its own data from its own endpoint,
 * and this must not grow into a second copy of those.
 */
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
  const [tasks, people, starred] = await Promise.all([
    source.getTasks(),
    source.getPeople(),
    source.getDocuments({ favorites: true }),
  ]);

  return NextResponse.json(
    {
      workspaceId: auth.workspace.workspaceId,
      now: now.toISOString(),
      tasks,
      people,
      pinned: starred
        .slice(0, PINNED_LIMIT)
        .map((document) => ({ id: document.id, title: document.title })),
    },
    { headers: NO_STORE }
  );
}
