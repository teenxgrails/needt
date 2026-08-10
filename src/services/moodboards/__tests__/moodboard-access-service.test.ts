import {
  listMoodboardAccessGrants,
  removeMoodboardAccessGrant,
  setMoodboardAccessGrant,
} from "@/services/moodboards/moodboard-access-service";
import {
  MoodboardAccessRole,
  WorkspaceKind,
  WorkspaceRole,
} from "@prisma/client";

jest.mock("@/lib/auth/moodboard-auth", () => ({
  resolveMoodboardAccess: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    moodboard: { findFirst: jest.fn() },
    moodboardAccessGrant: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    workspaceMember: { findUnique: jest.fn() },
  },
}));

const { resolveMoodboardAccess } = jest.requireMock<
  typeof import("@/lib/auth/moodboard-auth")
>("@/lib/auth/moodboard-auth");
const { prisma } =
  jest.requireMock<typeof import("@/lib/prisma")>("@/lib/prisma");
const resolveAccess = resolveMoodboardAccess as jest.Mock;
const moodboardFindFirst = prisma.moodboard.findFirst as jest.Mock;
const memberFindUnique = prisma.workspaceMember.findUnique as jest.Mock;
const grantUpsert = prisma.moodboardAccessGrant.upsert as jest.Mock;

const actor = {
  userId: "owner",
  workspace: {
    enabled: true,
    workspaceId: "workspace",
    workspaceKind: WorkspaceKind.SHARED,
    role: WorkspaceRole.OWNER,
    dataScope: { mode: "workspace" as const, workspaceId: "workspace" },
  },
};

describe("Moodboard access grants", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resolveAccess.mockResolvedValue({
      moodboardId: "board",
      role: MoodboardAccessRole.FULL_ACCESS,
    });
    moodboardFindFirst.mockResolvedValue({
      id: "board",
      createdById: "owner",
      workspaceId: "workspace",
    });
  });

  it("requires Full Access before listing grants", async () => {
    resolveAccess.mockResolvedValue(null);

    await expect(
      listMoodboardAccessGrants(actor, "board")
    ).rejects.toMatchObject({
      code: "MOODBOARD_FULL_ACCESS_REQUIRED",
      status: 403,
    });
    expect(prisma.moodboardAccessGrant.findMany).not.toHaveBeenCalled();
  });

  it("refuses to grant access to a non-member", async () => {
    memberFindUnique.mockResolvedValue(null);

    await expect(
      setMoodboardAccessGrant(
        actor,
        "board",
        "outsider",
        MoodboardAccessRole.EDITOR
      )
    ).rejects.toMatchObject({ code: "WORKSPACE_MEMBER_REQUIRED", status: 403 });
    expect(prisma.moodboardAccessGrant.upsert).not.toHaveBeenCalled();
  });

  it("stores a direct role only for a current workspace member", async () => {
    memberFindUnique.mockResolvedValue({ userId: "member" });
    grantUpsert.mockResolvedValue({
      userId: "member",
      role: MoodboardAccessRole.VIEWER,
    });

    await setMoodboardAccessGrant(
      actor,
      "board",
      "member",
      MoodboardAccessRole.VIEWER
    );

    expect(prisma.workspaceMember.findUnique).toHaveBeenCalledWith({
      where: {
        workspaceId_userId: {
          workspaceId: "workspace",
          userId: "member",
        },
      },
      select: { userId: true },
    });
    expect(prisma.moodboardAccessGrant.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          moodboardId: "board",
          userId: "member",
          role: MoodboardAccessRole.VIEWER,
          grantedById: "owner",
        }),
      })
    );
  });

  it("keeps the creator's Full Access fixed", async () => {
    await expect(
      removeMoodboardAccessGrant(actor, "board", "owner")
    ).rejects.toMatchObject({
      code: "MOODBOARD_CREATOR_ACCESS_FIXED",
      status: 403,
    });
    expect(prisma.moodboardAccessGrant.deleteMany).not.toHaveBeenCalled();
  });
});
