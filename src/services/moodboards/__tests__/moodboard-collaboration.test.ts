import { isCollaborationReadOnly } from "@/collaboration/access-policy";
import {
  authenticateMoodboardCollaboration,
  moodboardIdFromCollaborationDocument,
} from "@/services/moodboards/moodboard-collaboration-auth";
import {
  type MoodboardCollaborationClaims,
  issueMoodboardCollaborationToken,
  verifyMoodboardCollaborationToken,
} from "@/services/moodboards/moodboard-collaboration-token";
import {
  MoodboardAccessRole,
  WorkspaceKind,
  WorkspaceRole,
} from "@prisma/client";
import { createHmac } from "node:crypto";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    moodboardCollaborationState: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));
jest.mock("@/lib/auth/workspace-auth", () => ({
  resolveWorkspaceAccess: jest.fn(),
}));
jest.mock("@/lib/auth/moodboard-auth", () => ({
  resolveMoodboardAccess: jest.fn(),
}));

const { resolveWorkspaceAccess } = jest.requireMock<
  typeof import("@/lib/auth/workspace-auth")
>("@/lib/auth/workspace-auth");
const { resolveMoodboardAccess } = jest.requireMock<
  typeof import("@/lib/auth/moodboard-auth")
>("@/lib/auth/moodboard-auth");
const resolveWorkspaceAccessMock = resolveWorkspaceAccess as jest.Mock;
const resolveMoodboardAccessMock = resolveMoodboardAccess as jest.Mock;
const { prisma } =
  jest.requireMock<typeof import("@/lib/prisma")>("@/lib/prisma");
const stateFindUnique = prisma.moodboardCollaborationState
  .findUnique as jest.Mock;
const stateCreate = prisma.moodboardCollaborationState.create as jest.Mock;
const previousCollaborationSecret = process.env.COLLABORATION_SECRET;

function signedToken(overrides: Partial<MoodboardCollaborationClaims> = {}) {
  const claims: MoodboardCollaborationClaims = {
    resource: "moodboard",
    sub: "member",
    moodboardId: "board-a",
    workspaceId: "workspace",
    role: MoodboardAccessRole.EDITOR,
    exp: Math.floor(Date.now() / 1_000) + 60,
    jti: "token-id",
    ...overrides,
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = createHmac("sha256", "collaboration-test-secret")
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

describe("Moodboard collaboration security", () => {
  beforeAll(() => {
    process.env.COLLABORATION_SECRET = "collaboration-test-secret";
  });

  afterAll(() => {
    if (previousCollaborationSecret === undefined) {
      delete process.env.COLLABORATION_SECRET;
    } else {
      process.env.COLLABORATION_SECRET = previousCollaborationSecret;
    }
  });

  beforeEach(() => jest.clearAllMocks());

  it("rejects tampered, expired, and cross-resource tokens", () => {
    const valid = signedToken();
    expect(verifyMoodboardCollaborationToken(valid)?.moodboardId).toBe(
      "board-a"
    );
    expect(verifyMoodboardCollaborationToken(`${valid}x`)).toBeNull();
    expect(
      verifyMoodboardCollaborationToken(
        signedToken({ exp: Math.floor(Date.now() / 1_000) - 1 })
      )
    ).toBeNull();
    expect(
      verifyMoodboardCollaborationToken(
        signedToken({ resource: "page" as "moodboard" })
      )
    ).toBeNull();
  });

  it("rejects a valid token used for a guessed Moodboard room", async () => {
    await expect(
      authenticateMoodboardCollaboration(
        signedToken(),
        "moodboard:board-guessed"
      )
    ).rejects.toThrow("token is invalid");
    expect(resolveWorkspaceAccess).not.toHaveBeenCalled();
  });

  it("issues a five-minute token only after current board access resolves", async () => {
    const workspace = {
      enabled: true,
      workspaceId: "workspace",
      workspaceKind: WorkspaceKind.SHARED,
      role: WorkspaceRole.EDITOR,
      dataScope: { mode: "workspace" as const, workspaceId: "workspace" },
    };
    resolveMoodboardAccessMock.mockResolvedValue({
      moodboardId: "board-a",
      role: MoodboardAccessRole.EDITOR,
    });
    stateFindUnique.mockResolvedValue(null);
    stateCreate.mockResolvedValue({ state: Buffer.from([0, 0]) });

    const before = Date.now();
    const issued = await issueMoodboardCollaborationToken(
      { userId: "member", workspace },
      "board-a"
    );

    expect(issued?.role).toBe(MoodboardAccessRole.EDITOR);
    expect(issued?.expiresAt).toBeGreaterThan(before);
    expect(issued?.expiresAt).toBeLessThanOrEqual(before + 5 * 60 * 1_000);
    expect(
      verifyMoodboardCollaborationToken(issued?.token ?? "")
    ).toMatchObject({
      resource: "moodboard",
      sub: "member",
      moodboardId: "board-a",
      workspaceId: "workspace",
      role: MoodboardAccessRole.EDITOR,
    });
  });

  it("rejects a valid token after workspace membership is lost", async () => {
    resolveWorkspaceAccessMock.mockRejectedValue(
      new Error("Workspace access denied")
    );

    await expect(
      authenticateMoodboardCollaboration(signedToken(), "moodboard:board-a")
    ).rejects.toThrow("Workspace access denied");
    expect(resolveMoodboardAccess).not.toHaveBeenCalled();
  });

  it("rechecks the current role instead of trusting token claims", async () => {
    resolveWorkspaceAccessMock.mockResolvedValue({
      enabled: true,
      workspaceId: "workspace",
      workspaceKind: WorkspaceKind.SHARED,
      role: WorkspaceRole.VIEWER,
      dataScope: { mode: "workspace", workspaceId: "workspace" },
    });
    resolveMoodboardAccessMock.mockResolvedValue({
      moodboardId: "board-a",
      role: MoodboardAccessRole.VIEWER,
    });

    await expect(
      authenticateMoodboardCollaboration(signedToken(), "moodboard:board-a")
    ).resolves.toEqual(
      expect.objectContaining({
        resource: "moodboard",
        moodboardId: "board-a",
        role: MoodboardAccessRole.VIEWER,
      })
    );
  });

  it("maps the current Viewer role to the server read-only boundary", () => {
    const context = {
      resource: "moodboard" as const,
      actor: { userId: "member" },
      moodboardId: "board-a",
      role: MoodboardAccessRole.VIEWER,
    };

    expect(isCollaborationReadOnly(context)).toBe(true);
    expect(
      isCollaborationReadOnly({
        ...context,
        role: MoodboardAccessRole.EDITOR,
      })
    ).toBe(false);
  });

  it("parses only Moodboard collaboration document names", () => {
    expect(moodboardIdFromCollaborationDocument("moodboard:board-a")).toBe(
      "board-a"
    );
    expect(moodboardIdFromCollaborationDocument("page:board-a")).toBeNull();
  });
});
