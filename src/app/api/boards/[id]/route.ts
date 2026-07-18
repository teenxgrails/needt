import { NextRequest, NextResponse } from "next/server";

import {
  deleteBoard,
  getBoard,
  updateBoard,
} from "@/services/boards/boardService";

import { routeErrorResponse } from "@/lib/api/route-error";
import { authenticateRequest } from "@/lib/auth/api-auth";

const LOG_SOURCE = "board-route";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;

  try {
    const { id } = await params;
    const board = await getBoard(auth.userId, id);
    if (!board) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ board });
  } catch (error) {
    return routeErrorResponse(
      error,
      "Failed to load board",
      LOG_SOURCE,
      "Could not load board."
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const board = await updateBoard(auth.userId, id, {
      name: typeof body.name === "string" ? body.name : undefined,
      icon:
        body.icon === null || typeof body.icon === "string"
          ? body.icon
          : undefined,
      groupBy: typeof body.groupBy === "string" ? body.groupBy : undefined,
      position: typeof body.position === "number" ? body.position : undefined,
    });
    if (!board) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ board });
  } catch (error) {
    return routeErrorResponse(
      error,
      "Failed to update board",
      LOG_SOURCE,
      "Could not update board."
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;

  try {
    const { id } = await params;
    const result = await deleteBoard(auth.userId, id);
    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return routeErrorResponse(
      error,
      "Failed to delete board",
      LOG_SOURCE,
      "Could not delete board."
    );
  }
}
