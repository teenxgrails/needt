import { NextRequest, NextResponse } from "next/server";

import { issueMoodboardCollaborationToken } from "@/services/moodboards/moodboard-collaboration-token";

import { authenticateRequest } from "@/lib/auth/api-auth";

const LOG_SOURCE = "MoodboardCollaborationTokenAPI";
type RouteContext = { params: Promise<{ id: string }> };

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
  return NextResponse.json({
    ...issued,
    documentName: `moodboard:${id}`,
    url:
      process.env.COLLABORATION_PUBLIC_URL ??
      process.env.NEXT_PUBLIC_COLLABORATION_URL ??
      "ws://localhost:1234",
  });
}
