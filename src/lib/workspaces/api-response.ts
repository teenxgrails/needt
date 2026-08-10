import { NextResponse } from "next/server";

import { ZodError } from "zod";

import { WorkspaceAuthorizationError } from "@/lib/auth/workspace-auth";
import { WorkspaceServiceError } from "@/services/workspaces/workspace-service";

export function workspaceApiError(error: unknown) {
  if (
    error instanceof WorkspaceAuthorizationError ||
    error instanceof WorkspaceServiceError
  ) {
    return NextResponse.json(
      { error: error.code },
      { status: error.status }
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "INVALID_WORKSPACE_REQUEST", issues: error.issues },
      { status: 400 }
    );
  }
  return null;
}
