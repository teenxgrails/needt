import { NextRequest, NextResponse } from "next/server";

import { routeErrorResponse } from "@/lib/api/route-error";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { deleteMailFocusedSplit } from "@/lib/mail-db";

const LOG_SOURCE = "MailFocusedSplitAPI";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  try {
    const { id } = await params;
    const result = await deleteMailFocusedSplit(auth.userId, id);
    if (!result.count) {
      return NextResponse.json(
        { error: "Focused Mail split not found." },
        { status: 404 }
      );
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return routeErrorResponse(
      error,
      "Failed to delete focused Mail split",
      LOG_SOURCE,
      "Could not delete focused Mail split."
    );
  }
}
