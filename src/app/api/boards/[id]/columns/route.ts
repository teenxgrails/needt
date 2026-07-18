import { NextRequest, NextResponse } from "next/server";

import { createColumn } from "@/services/boards/boardService";

import { routeErrorResponse } from "@/lib/api/route-error";
import { authenticateRequest } from "@/lib/auth/api-auth";

const LOG_SOURCE = "board-columns-route";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const column = await createColumn(auth.userId, id, {
      name: typeof body.name === "string" ? body.name : "New column",
      color: typeof body.color === "string" ? body.color : null,
    });
    if (!column) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ column });
  } catch (error) {
    return routeErrorResponse(
      error,
      "Failed to create board column",
      LOG_SOURCE,
      "Could not create board column."
    );
  }
}
