import { NextRequest, NextResponse } from "next/server";

import { issueMoodboardCollaborationToken } from "@/services/moodboards/moodboard-collaboration-token";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "MoodboardCollaborationTokenAPI";
type RouteContext = { params: Promise<{ id: string }> };
const CURSOR_COLORS = ["#4F46E5", "#0F766E", "#B45309", "#BE123C", "#7E22CE"];

function cursorColor(userId: string) {
  return CURSOR_COLORS[
    [...userId].reduce(
      (sum, character) =>
        (sum + character.charCodeAt(0)) % CURSOR_COLORS.length,
      0
    )
  ];
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const issued = await issueMoodboardCollaborationToken(auth, id);
  if (!issued) {
    return NextResponse.json(
      { error: "Moodboard access denied" },
      { status: 403 }
    );
  }
  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { name: true, email: true },
  });
  return NextResponse.json({
    ...issued,
    documentName: `moodboard:${id}`,
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
