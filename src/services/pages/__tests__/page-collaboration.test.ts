import {
  authenticatePageCollaboration,
  pageIdFromCollaborationDocument,
  reauthorizePageCollaboration,
} from "@/services/pages/page-collaboration-auth";
import {
  type PageCollaborationClaims,
  verifyPageCollaborationToken,
} from "@/services/pages/page-collaboration-token";
import { PageAccessRole, WorkspaceKind, WorkspaceRole } from "@prisma/client";
import { createHmac, randomBytes } from "node:crypto";
import * as Y from "yjs";

jest.mock("@/lib/prisma", () => ({ prisma: {} }));
jest.mock("@/lib/auth/workspace-auth", () => ({
  resolveWorkspaceAccess: jest.fn(),
}));
jest.mock("@/lib/auth/page-auth", () => ({ resolvePageAccess: jest.fn() }));

const { resolveWorkspaceAccess } = jest.requireMock<
  typeof import("@/lib/auth/workspace-auth")
>("@/lib/auth/workspace-auth");
const { resolvePageAccess } = jest.requireMock<
  typeof import("@/lib/auth/page-auth")
>("@/lib/auth/page-auth");
const resolveWorkspaceAccessMock = resolveWorkspaceAccess as jest.Mock;
const resolvePageAccessMock = resolvePageAccess as jest.Mock;
const previousCollaborationSecret = process.env.COLLABORATION_SECRET;
const collaborationSecret = randomBytes(32).toString("hex");

function signedToken(overrides: Partial<PageCollaborationClaims> = {}) {
  const claims: PageCollaborationClaims = {
    sub: "member",
    pageId: "page-a",
    workspaceId: "workspace",
    role: PageAccessRole.EDITOR,
    exp: Math.floor(Date.now() / 1_000) + 60,
    jti: "token-id",
    ...overrides,
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = createHmac("sha256", collaborationSecret)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

describe("Page collaboration security", () => {
  beforeAll(() => {
    process.env.COLLABORATION_SECRET = collaborationSecret;
  });

  afterAll(() => {
    if (previousCollaborationSecret === undefined) {
      delete process.env.COLLABORATION_SECRET;
    } else {
      process.env.COLLABORATION_SECRET = previousCollaborationSecret;
    }
  });

  beforeEach(() => jest.clearAllMocks());

  it("rejects tampered and expired collaboration tokens", () => {
    const valid = signedToken();
    expect(verifyPageCollaborationToken(valid)?.pageId).toBe("page-a");
    expect(verifyPageCollaborationToken(`${valid}x`)).toBeNull();
    expect(
      verifyPageCollaborationToken(
        signedToken({ exp: Math.floor(Date.now() / 1_000) - 1 })
      )
    ).toBeNull();
  });

  it("rejects a valid token used for a guessed Page document", async () => {
    await expect(
      authenticatePageCollaboration(signedToken(), "page:page-b")
    ).rejects.toThrow("token is invalid");
    expect(resolveWorkspaceAccess).not.toHaveBeenCalled();
  });

  it("rechecks membership and direct Page access at socket authentication", async () => {
    resolveWorkspaceAccessMock.mockResolvedValue({
      enabled: true,
      workspaceId: "workspace",
      workspaceKind: WorkspaceKind.SHARED,
      role: WorkspaceRole.EDITOR,
      dataScope: { mode: "workspace", workspaceId: "workspace" },
    });
    resolvePageAccessMock.mockResolvedValue(null);

    await expect(
      authenticatePageCollaboration(signedToken(), "page:page-a")
    ).rejects.toThrow("access denied");
    expect(resolvePageAccess).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "member" }),
      "page-a"
    );
  });

  it("returns the current Page role for the socket read-only boundary", async () => {
    resolveWorkspaceAccessMock.mockResolvedValue({
      enabled: true,
      workspaceId: "workspace",
      workspaceKind: WorkspaceKind.SHARED,
      role: WorkspaceRole.VIEWER,
      dataScope: { mode: "workspace", workspaceId: "workspace" },
    });
    resolvePageAccessMock.mockResolvedValue({
      pageId: "page-a",
      role: PageAccessRole.VIEWER,
    });

    await expect(
      authenticatePageCollaboration(signedToken(), "page:page-a")
    ).resolves.toEqual(
      expect.objectContaining({ pageId: "page-a", role: PageAccessRole.VIEWER })
    );
  });

  it("refreshes an open socket from Editor to the current Viewer role", async () => {
    const workspace = {
      enabled: true,
      workspaceId: "workspace",
      workspaceKind: WorkspaceKind.SHARED,
      role: WorkspaceRole.VIEWER,
      dataScope: { mode: "workspace" as const, workspaceId: "workspace" },
    };
    resolveWorkspaceAccessMock.mockResolvedValue(workspace);
    resolvePageAccessMock.mockResolvedValue({
      pageId: "page-a",
      role: PageAccessRole.VIEWER,
    });

    await expect(
      reauthorizePageCollaboration(
        {
          resource: "page",
          actor: {
            userId: "member",
            workspace: { ...workspace, role: WorkspaceRole.EDITOR },
          },
          pageId: "page-a",
          role: PageAccessRole.EDITOR,
        },
        "page:page-a"
      )
    ).resolves.toMatchObject({ role: PageAccessRole.VIEWER });
  });

  it("rejects an open socket after membership removal", async () => {
    resolveWorkspaceAccessMock.mockRejectedValue(
      new Error("Workspace access denied")
    );

    await expect(
      reauthorizePageCollaboration(
        {
          resource: "page",
          actor: {
            userId: "member",
            workspace: {
              enabled: true,
              workspaceId: "workspace",
              workspaceKind: WorkspaceKind.SHARED,
              role: WorkspaceRole.EDITOR,
              dataScope: { mode: "workspace", workspaceId: "workspace" },
            },
          },
          pageId: "page-a",
          role: PageAccessRole.EDITOR,
        },
        "page:page-a"
      )
    ).rejects.toThrow("Workspace access denied");
  });

  it("parses only Page collaboration document names", () => {
    expect(pageIdFromCollaborationDocument("page:page-a")).toBe("page-a");
    expect(pageIdFromCollaborationDocument("task:page-a")).toBeNull();
  });
});

describe("Page collaboration concurrency", () => {
  it("merges concurrent offline edits without losing either update", () => {
    const seed = new Y.Doc();
    seed.getText("page").insert(0, "Start ");
    const initialState = Y.encodeStateAsUpdate(seed);
    const first = new Y.Doc();
    const second = new Y.Doc();
    Y.applyUpdate(first, initialState);
    Y.applyUpdate(second, initialState);

    first.getText("page").insert(6, "alpha ");
    second.getText("page").insert(6, "beta ");
    const firstUpdate = Y.encodeStateAsUpdate(first);
    const secondUpdate = Y.encodeStateAsUpdate(second);
    Y.applyUpdate(first, secondUpdate);
    Y.applyUpdate(second, firstUpdate);

    expect(first.getText("page").toString()).toBe(
      second.getText("page").toString()
    );
    expect(first.getText("page").toString()).toContain("alpha");
    expect(first.getText("page").toString()).toContain("beta");
  });
});
