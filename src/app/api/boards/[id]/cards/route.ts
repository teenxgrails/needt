import { NextRequest, NextResponse } from "next/server";

import { addCard, moveCard } from "@/services/boards/boardService";

import { routeErrorResponse } from "@/lib/api/route-error";
import { authenticateRequest } from "@/lib/auth/api-auth";

const LOG_SOURCE = "board-cards-route";

// POST adds a new card to a column.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    if (typeof body.columnId !== "string" || typeof body.title !== "string") {
      return NextResponse.json(
        { error: "columnId and title are required" },
        { status: 400 }
      );
    }

    const task = await addCard(auth.userId, {
      boardId: id,
      columnId: body.columnId,
      title: body.title,
    });
    if (!task) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ task });
  } catch (error) {
    return routeErrorResponse(
      error,
      "Failed to create board card",
      LOG_SOURCE,
      "Could not create board card."
    );
  }
}

// PATCH moves a card into a column at a given index (drag-and-drop / keyboard).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    if (
      typeof body.taskId !== "string" ||
      typeof body.columnId !== "string" ||
      typeof body.toIndex !== "number"
    ) {
      return NextResponse.json(
        { error: "taskId, columnId and toIndex are required" },
        { status: 400 }
      );
    }

    const task = await moveCard(auth.userId, {
      taskId: body.taskId,
      boardId: id,
      columnId: body.columnId,
      toIndex: body.toIndex,
    });
    if (!task) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ task });
  } catch (error) {
    return routeErrorResponse(
      error,
      "Failed to move board card",
      LOG_SOURCE,
      "Could not move board card."
    );
  }
}
