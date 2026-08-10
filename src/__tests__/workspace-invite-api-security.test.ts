import { NextRequest, NextResponse } from "next/server";

import * as acceptRoute from "@/app/api/workspace-invites/accept/route";
import * as invitesRoute from "@/app/api/workspaces/[id]/invites/route";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { enforceRateLimits } from "@/lib/security/rate-limit";
import {
  acceptWorkspaceInvite,
  inviteWorkspaceMember,
} from "@/services/workspaces/workspace-service";

jest.mock("@/lib/auth/api-auth");
jest.mock("@/lib/security/rate-limit", () => ({
  accountRule: jest.fn((identifier, namespace, limit, windowSeconds) => ({
    identifier,
    namespace,
    limit,
    windowSeconds,
  })),
  enforceRateLimits: jest.fn(),
  ipRule: jest.fn((_request, namespace, limit, windowSeconds) => ({
    identifier: "request-ip",
    namespace,
    limit,
    windowSeconds,
  })),
}));
jest.mock("@/services/workspaces/workspace-service", () => ({
  acceptWorkspaceInvite: jest.fn(),
  inviteWorkspaceMember: jest.fn(),
  listWorkspaceInvites: jest.fn(),
  WorkspaceServiceError: class WorkspaceServiceError extends Error {},
}));

describe("workspace invite API security", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(authenticateRequest).mockResolvedValue({ userId: "owner-1" });
    jest.mocked(enforceRateLimits).mockResolvedValue(null);
  });

  it("rate-limits invite creation by IP and authenticated account", async () => {
    jest.mocked(inviteWorkspaceMember).mockResolvedValue({ id: "invite-1" } as never);
    const request = new NextRequest(
      "http://localhost/api/workspaces/workspace-1/invites",
      {
        method: "POST",
        body: JSON.stringify({ email: "member@example.com", role: "EDITOR" }),
      }
    );

    const response = await invitesRoute.POST(request, {
      params: Promise.resolve({ id: "workspace-1" }),
    });

    expect(response!.status).toBe(201);
    expect(enforceRateLimits).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ namespace: "workspace-invite:ip" }),
        expect.objectContaining({ namespace: "workspace-invite:account" }),
      ]),
      { route: "/api/workspaces/workspace-1/invites", userId: "owner-1" }
    );
  });

  it("stops invite acceptance before token lookup when limited", async () => {
    jest.mocked(enforceRateLimits).mockResolvedValue(
      NextResponse.json({ error: "limited" }, { status: 429 })
    );
    const request = new NextRequest(
      "http://localhost/api/workspace-invites/accept",
      {
        method: "POST",
        body: JSON.stringify({ token: "x".repeat(32) }),
      }
    );

    const response = await acceptRoute.POST(request);

    expect(response!.status).toBe(429);
    expect(enforceRateLimits).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ namespace: "workspace-invite-accept:ip" }),
        expect.objectContaining({
          namespace: "workspace-invite-accept:account",
        }),
      ]),
      { route: "/api/workspace-invites/accept", userId: "owner-1" }
    );
    expect(acceptWorkspaceInvite).not.toHaveBeenCalled();
  });
});
