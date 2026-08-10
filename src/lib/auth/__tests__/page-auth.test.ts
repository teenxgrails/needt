import { PageAccessRole, WorkspaceKind, WorkspaceRole } from "@prisma/client";

import { resolvePageAccess } from "@/lib/auth/page-auth";

jest.mock("@/lib/prisma", () => ({
  prisma: { page: { findFirst: jest.fn() } },
}));

const { prisma } =
  jest.requireMock<typeof import("@/lib/prisma")>("@/lib/prisma");
const findFirst = prisma.page.findFirst as jest.Mock;

function actor(role: WorkspaceRole) {
  return {
    userId: "member",
    workspace: {
      enabled: true,
      workspaceId: "workspace",
      workspaceKind: WorkspaceKind.SHARED,
      role,
      dataScope: { mode: "workspace" as const, workspaceId: "workspace" },
    },
  };
}

describe("page access resolver", () => {
  beforeEach(() => jest.clearAllMocks());

  it("lets a direct Editor grant upgrade a workspace Viewer", async () => {
    findFirst.mockResolvedValue({
      id: "page",
      userId: "owner",
      workspaceId: "workspace",
      isPrivate: false,
      accessGrants: [{ role: PageAccessRole.EDITOR }],
    });

    await expect(
      resolvePageAccess(
        actor(WorkspaceRole.VIEWER),
        "page",
        PageAccessRole.EDITOR
      )
    ).resolves.toEqual({ pageId: "page", role: PageAccessRole.EDITOR });
  });

  it("lets a direct Viewer grant downgrade a workspace Owner", async () => {
    findFirst.mockResolvedValue({
      id: "page",
      userId: "another-owner",
      workspaceId: "workspace",
      isPrivate: false,
      accessGrants: [{ role: PageAccessRole.VIEWER }],
    });

    await expect(
      resolvePageAccess(
        actor(WorkspaceRole.OWNER),
        "page",
        PageAccessRole.EDITOR
      )
    ).resolves.toBeNull();
  });

  it("does not inherit workspace access for a private Page", async () => {
    findFirst.mockResolvedValue({
      id: "private-page",
      userId: "owner",
      workspaceId: "workspace",
      isPrivate: true,
      accessGrants: [],
    });

    await expect(
      resolvePageAccess(actor(WorkspaceRole.OWNER), "private-page")
    ).resolves.toBeNull();
  });

  it("keeps the Page creator at Full Access", async () => {
    findFirst.mockResolvedValue({
      id: "page",
      userId: "member",
      workspaceId: "workspace",
      isPrivate: true,
      accessGrants: [{ role: PageAccessRole.VIEWER }],
    });

    await expect(
      resolvePageAccess(
        actor(WorkspaceRole.VIEWER),
        "page",
        PageAccessRole.FULL_ACCESS
      )
    ).resolves.toEqual({ pageId: "page", role: PageAccessRole.FULL_ACCESS });
  });
});
