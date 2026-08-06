import { NextRequest, NextResponse } from "next/server";

import { issuePageCollaborationToken } from "@/services/pages/page-collaboration-token";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "PageCollaborationTokenAPI";
type RouteContext = { params: Promise<{ id: string }> };

const CURSOR_COLORS = ["#4F46E5", "#0F766E", "#B45309", "#BE123C", "#7E22CE"];

function cursorColor(userId: string) {
  const index = [...userId].reduce((sum, character) => {
    return (sum + character.charCodeAt(0)) % CURSOR_COLORS.length;
  }, 0);
  return CURSOR_COLORS[index];
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const issued = await issuePageCollaborationToken(auth, id);
  if (!issued) {
    return NextResponse.json({ error: "Page access denied" }, { status: 403 });
  }
  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { name: true, email: true },
  });
  return NextResponse.json({
    ...issued,
    documentName: `page:${id}`,
    url:
      process.env.COLLABORATION_PUBLIC_URL ??
      process.env.NEXT_PUBLIC_COLLABORATION_URL ??
      "ws://localhost:1234",
    user: {
      name: user?.name || user?.email || "Needt collaborator",
      color: cursorColor(auth.userId),
    },
  });
}
