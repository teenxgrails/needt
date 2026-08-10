import {
  getPublishedPage,
  publishPage,
  unpublishPage,
} from "@/services/pages/page-publication-service";
import { PageAccessRole } from "@prisma/client";

import { newDate } from "@/lib/date-utils";

jest.mock("@/lib/auth/page-auth", () => ({ resolvePageAccess: jest.fn() }));
jest.mock("@/lib/pages/page-publication-realtime", () => ({
  publishPagePublicationRevoked: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    pagePublication: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

const { resolvePageAccess } = jest.requireMock<
  typeof import("@/lib/auth/page-auth")
>("@/lib/auth/page-auth");
const { publishPagePublicationRevoked } = jest.requireMock<
  typeof import("@/lib/pages/page-publication-realtime")
>("@/lib/pages/page-publication-realtime");
const { prisma } =
  jest.requireMock<typeof import("@/lib/prisma")>("@/lib/prisma");
const resolvePageAccessMock = resolvePageAccess as jest.Mock;
const publication = prisma.pagePublication as unknown as {
  findFirst: jest.Mock;
  findUnique: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  updateMany: jest.Mock;
};

describe("Page publishing", () => {
  beforeEach(() => jest.clearAllMocks());

  it("requires Full Access before creating a public link", async () => {
    resolvePageAccessMock.mockResolvedValue(null);

    await expect(publishPage({ userId: "viewer" }, "page")).resolves.toBeNull();
    expect(resolvePageAccess).toHaveBeenCalledWith(
      { userId: "viewer" },
      "page",
      PageAccessRole.FULL_ACCESS
    );
    expect(publication.create).not.toHaveBeenCalled();
  });

  it("revokes an active link and notifies open public sessions", async () => {
    resolvePageAccessMock.mockResolvedValue({
      pageId: "page",
      role: PageAccessRole.FULL_ACCESS,
    });
    publication.findUnique.mockResolvedValue({
      pageId: "page",
      token: "public-token",
      revokedAt: null,
    });
    publication.update.mockResolvedValue({
      pageId: "page",
      token: "public-token",
      revokedAt: newDate(0),
    });

    await unpublishPage({ userId: "owner" }, "page");

    expect(publication.update).toHaveBeenCalledWith({
      where: { pageId: "page" },
      data: { revokedAt: expect.any(Date) },
    });
    expect(publishPagePublicationRevoked).toHaveBeenCalledWith("public-token");
  });

  it("rewrites private asset URLs in the public read-only snapshot", async () => {
    publication.findFirst.mockResolvedValue({
      page: {
        id: "page",
        title: "Published",
        icon: null,
        coverUrl: null,
        updatedAt: newDate(0),
        blocks: [
          {
            id: "block",
            parentBlockId: null,
            type: "IMAGE",
            content: {
              json: {
                type: "image",
                attrs: { src: "/api/pages/page/assets/asset" },
              },
            },
            position: 1024,
            createdBy: "HUMAN",
          },
        ],
      },
    });

    const result = await getPublishedPage("public-token");

    expect(result?.blocks[0].content).toEqual({
      json: {
        type: "image",
        attrs: {
          src: "/api/public/pages/public-token/assets/asset",
        },
      },
    });
  });
});
