const findMany = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: { page: { findMany } },
}));

import { listAiReadablePages } from "@/services/pages/page-service";

describe("Pages AI privacy", () => {
  it("excludes private pages and all descendants", async () => {
    findMany.mockResolvedValue([
      { id: "public", parentId: null, title: "Public", isPrivate: false, updatedAt: new Date(), blocks: [] },
      { id: "private", parentId: null, title: "Journal", isPrivate: true, updatedAt: new Date(), blocks: [] },
      { id: "child", parentId: "private", title: "Nested secret", isPrivate: false, updatedAt: new Date(), blocks: [] },
    ]);
    await expect(listAiReadablePages("user")).resolves.toEqual([
      expect.objectContaining({ id: "public" }),
    ]);
  });
});
