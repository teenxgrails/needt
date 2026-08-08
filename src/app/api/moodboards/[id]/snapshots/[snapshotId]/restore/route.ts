import { NextRequest, NextResponse } from "next/server";

import { getMoodboardSnapshot } from "@/services/moodboards/moodboard-service";

import { authenticateRequest } from "@/lib/auth/api-auth";

const LOG_SOURCE = "MoodboardSnapshotRestoreAPI";
type RouteContext = { params: Promise<{ id: string; snapshotId: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const { id, snapshotId } = await params;
  const snapshot = await getMoodboardSnapshot(auth, id, snapshotId);
  return snapshot
    ? NextResponse.json({ snapshot })
    : NextResponse.json({ error: "Moodboard access denied" }, { status: 403 });
}
