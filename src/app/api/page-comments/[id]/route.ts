import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "PageCommentAPI";
type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const existing = await prisma.pageComment.findFirst({
    where: { id, userId: auth.userId },
  });
  if (!existing)
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  const nextBody =
    typeof body.body === "string"
      ? body.body.trim().slice(0, 4_000)
      : undefined;
  if (body.body !== undefined && !nextBody) {
    return NextResponse.json(
      { error: "Comment cannot be empty" },
      { status: 400 }
    );
  }
  const comment = await prisma.pageComment.update({
    where: { id },
    data: {
      ...(nextBody !== undefined ? { body: nextBody } : {}),
      ...(typeof body.resolved === "boolean"
        ? { resolvedAt: body.resolved ? new Date() : null }
        : {}),
    },
  });
  return NextResponse.json({ comment });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const result = await prisma.pageComment.deleteMany({
    where: { id, userId: auth.userId },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
