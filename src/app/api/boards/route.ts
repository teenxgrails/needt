import { NextRequest, NextResponse } from "next/server";

import { createBoard, listBoards } from "@/services/boards/boardService";

import { routeErrorResponse } from "@/lib/api/route-error";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { canCreateBoard } from "@/lib/boards/can-create-board";

const LOG_SOURCE = "boards-route";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;

  try {
    const boards = await listBoards(auth.userId);
    return NextResponse.json({ boards });
  } catch (error) {
    return routeErrorResponse(
      error,
      "Failed to list boards",
      LOG_SOURCE,
      "Could not load boards."
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;

  try {
    const entitlement = await canCreateBoard(auth.userId);
    if (!entitlement.allowed) {
      return NextResponse.json(
        { error: "Board limit reached", entitlement },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const board = await createBoard(auth.userId, {
      name: body.name,
      icon: typeof body.icon === "string" ? body.icon : null,
      columns: Array.isArray(body.columns)
        ? body.columns.filter(
            (c: unknown): c is string => typeof c === "string"
          )
        : undefined,
    });
    return NextResponse.json({ board });
  } catch (error) {
    return routeErrorResponse(
      error,
      "Failed to create board",
      LOG_SOURCE,
      "Could not create board."
    );
  }
}
