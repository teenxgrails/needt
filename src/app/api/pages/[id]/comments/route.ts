import { NextRequest, NextResponse } from "next/server";

import { PageAccessRole } from "@prisma/client";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { resolvePageAccess } from "@/lib/auth/page-auth";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "PageCommentsAPI";
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  if (!(await resolvePageAccess(auth, id)))
    return NextResponse.json({ error: "Page access denied" }, { status: 403 });
  const comments = await prisma.pageComment.findMany({
    where: { pageId: id },
    orderBy: [{ resolvedAt: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ comments });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text || text.length > 4_000) {
    return NextResponse.json(
      { error: "Comment must be between 1 and 4,000 characters" },
      { status: 400 }
    );
  }
  if (!(await resolvePageAccess(auth, id, PageAccessRole.EDITOR)))
    return NextResponse.json({ error: "Page access denied" }, { status: 403 });
  const blockId = typeof body.blockId === "string" ? body.blockId : null;
  if (
    blockId &&
    !(await prisma.pageBlock.findFirst({
      where: { id: blockId, pageId: id },
      select: { id: true },
    }))
  ) {
    return NextResponse.json({ error: "Block not found" }, { status: 404 });
  }
  const comment = await prisma.pageComment.create({
    data: {
      pageId: id,
      blockId,
      userId: auth.userId,
      body: text,
    },
  });
  return NextResponse.json({ comment }, { status: 201 });
}
