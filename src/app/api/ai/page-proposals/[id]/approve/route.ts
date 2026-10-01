import { NextRequest, NextResponse } from "next/server";

import { applyAiProposal } from "@/services/pages/page-service";
import {
  PageCollaborationActiveError,
  PageRevisionConflictError,
} from "@/services/pages/page-write-path";

import { routeErrorResponse } from "@/lib/api/route-error";
import { authenticateRequest } from "@/lib/auth/api-auth";

const LOG_SOURCE = "AiPageProposalApproveAPI";
type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    const proposal = await applyAiProposal(auth, id);
    if (!proposal)
      return NextResponse.json(
        { error: "Proposal unavailable" },
        { status: 404 }
      );
    return NextResponse.json({ proposal });
  } catch (error) {
    if (
      error instanceof PageCollaborationActiveError ||
      error instanceof PageRevisionConflictError
    ) {
      return NextResponse.json(
        { error: error.code, repairable: true },
        { status: 409 }
      );
    }
    return routeErrorResponse(
      error,
      "Failed to apply AI proposal",
      LOG_SOURCE,
      "Could not apply proposal."
    );
  }
}
