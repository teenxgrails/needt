import {
  PageMetadataError,
  parsePageSmartFolderQuery,
} from "@/services/pages/page-metadata-service";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    pageFolder: { findFirst: jest.fn() },
    pageTag: { count: jest.fn() },
  },
}));

describe("Page metadata smart-folder contract", () => {
  it("accepts only the explicit v1 query fields", () => {
    expect(
      parsePageSmartFolderQuery({
        version: 1,
        folderId: "folder-1",
        tagIds: ["tag-1"],
        favorites: true,
      })
    ).toEqual({
      version: 1,
      folderId: "folder-1",
      tagIds: ["tag-1"],
      favorites: true,
    });
  });

  it("rejects future or unbounded query shapes", () => {
    expect(() => parsePageSmartFolderQuery({ version: 2 })).toThrow(
      PageMetadataError
    );
    expect(() =>
      parsePageSmartFolderQuery({ version: 1, ownerId: "another-user" })
    ).toThrow(PageMetadataError);
  });
});
