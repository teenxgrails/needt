import { NextRequest } from "next/server";

import { WorkspaceRole } from "@prisma/client";

import { getEmailVerificationStatus } from "@/lib/auth/email-verification-access";
import { resolveWorkspaceAccess } from "@/lib/auth/workspace-auth";
import { authorizeConnectorWorkspace } from "@/services/connectors/auth";

jest.mock("@/lib/auth/email-verification-access", () => ({
  getEmailVerificationStatus: jest.fn(),
}));
jest.mock("@/lib/auth/workspace-auth", () => ({
  requestedWorkspaceId: jest.fn(),
  resolveWorkspaceAccess: jest.fn(),
  WorkspaceAuthorizationError: class WorkspaceAuthorizationError extends Error {},
}));

describe("connector email-verification access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects an unverified connector token owner while the flag is on", async () => {
    jest.mocked(getEmailVerificationStatus).mockResolvedValue({
      email: "person@example.com",
      required: true,
      verified: false,
    });

    const result = await authorizeConnectorWorkspace(
      new NextRequest("http://localhost/api/connect/tasks"),
      "user-1",
      WorkspaceRole.VIEWER
    );

    expect(result.response?.status).toBe(403);
    expect(resolveWorkspaceAccess).not.toHaveBeenCalled();
  });
});
