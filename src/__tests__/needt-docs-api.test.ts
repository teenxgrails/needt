import { NextRequest } from "next/server";

import { GET } from "@/app/api/needt/docs/route";
import { listPageMetadata } from "@/services/pages/page-metadata-service";
import { WorkspaceKind, WorkspaceRole } from "@prisma/client";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { prismaDataSource } from "@/lib/needt/prisma-source";

jest.mock("@/lib/auth/api-auth");
jest.mock("@/lib/needt/prisma-source");
jest.mock("@/services/pages/page-metadata-service");

const workspace = {
  enabled: true,
  workspaceId: "workspace-1",
  workspaceKind: WorkspaceKind.SHARED,
  role: WorkspaceRole.EDITOR,
  dataScope: { mode: "workspace" as const, workspaceId: "workspace-1" },
};

describe("Needt docs API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(authenticateRequest).mockResolvedValue({
      userId: "user-1",
      workspace,
    });
    jest.mocked(listPageMetadata).mockResolvedValue({
      folders: [],
      tags: [],
      smartFolders: [],
    });
  });

  it("reads filtered documents through the authorized data source", async () => {
    const getDocuments = jest.fn().mockResolvedValue([{ id: "page-1" }]);
    jest.mocked(prismaDataSource).mockReturnValue({
      getDocuments,
    } as unknown as ReturnType<typeof prismaDataSource>);
    const request = new NextRequest(
      "http://localhost/api/needt/docs?q=launch&folderId=folder-1&tagId=tag-1&favorites=true"
    );

    const response = (await GET(request))!;
    const body = await response.json();

    expect(prismaDataSource).toHaveBeenCalledWith("user-1", workspace);
    expect(getDocuments).toHaveBeenCalledWith({
      search: "launch",
      collectionId: "folder-1",
      tagIds: ["tag-1"],
      favorites: true,
      privateOnly: false,
    });
    expect(body).toEqual(
      expect.objectContaining({
        workspaceId: "workspace-1",
        canCreate: true,
        docs: [{ id: "page-1" }],
      })
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("marks a workspace Viewer unable to create", async () => {
    jest.mocked(authenticateRequest).mockResolvedValue({
      userId: "user-1",
      workspace: { ...workspace, role: WorkspaceRole.VIEWER },
    });
    jest.mocked(prismaDataSource).mockReturnValue({
      getDocuments: jest.fn().mockResolvedValue([]),
    } as unknown as ReturnType<typeof prismaDataSource>);

    const response = (await GET(
      new NextRequest("http://localhost/api/needt/docs")
    ))!;
    expect((await response.json()).canCreate).toBe(false);
  });
});
