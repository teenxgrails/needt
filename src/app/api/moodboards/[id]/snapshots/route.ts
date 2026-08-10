import { NextRequest, NextResponse } from "next/server";

import { listMoodboardSnapshots } from "@/services/moodboards/moodboard-service";

import { authenticateRequest } from "@/lib/auth/api-auth";

const LOG_SOURCE = "MoodboardSnapshotsAPI";
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const snapshots = await listMoodboardSnapshots(auth, id);
  return snapshots
    ? NextResponse.json({ snapshots })
    : NextResponse.json({ error: "Moodboard access denied" }, { status: 403 });
}
