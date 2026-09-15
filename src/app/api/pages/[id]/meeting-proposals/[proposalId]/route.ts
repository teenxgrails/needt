import { NextRequest, NextResponse } from "next/server";

import { WorkspaceRole } from "@prisma/client";
import { z } from "zod";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { decideMeetingNoteProposal } from "@/services/pages/meeting-note-proposals";

const LOG_SOURCE = "MeetingNoteProposalAPI";
type RouteContext = { params: Promise<{ id: string; proposalId: string }> };
const inputSchema = z.object({ decision: z.enum(["approve", "reject"]) });

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
  const auth = await authenticateRequest(
    request,
    LOG_SOURCE,
    parsed.data.decision === "approve"
      ? { requiredRole: WorkspaceRole.EDITOR }
      : {}
  );
  if ("response" in auth) return auth.response;
  const { id, proposalId } = await params;
  const result = await decideMeetingNoteProposal(
    auth,
    id,
    proposalId,
    parsed.data.decision
  );
  if (!result) return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  if ("stale" in result && result.stale) {
    return NextResponse.json({ error: "Meeting note changed. Review the proposal again.", code: "MEETING_PROPOSAL_STALE" }, { status: 409 });
  }
  return NextResponse.json(result);
}
