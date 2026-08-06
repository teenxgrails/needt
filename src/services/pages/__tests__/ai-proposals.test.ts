import {
  createAiProposal,
  rejectAiProposal,
} from "@/services/pages/page-service";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    page: { findFirst: jest.fn() },
    aiPageChangeProposal: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const { prisma } = jest.requireMock<typeof import("@/lib/prisma")>(
  "@/lib/prisma"
);
const pageFindFirst = prisma.page.findFirst as jest.Mock;
const proposalCreate = prisma.aiPageChangeProposal.create as jest.Mock;
const proposalFindFirst = prisma.aiPageChangeProposal.findFirst as jest.Mock;
const proposalUpdate = prisma.aiPageChangeProposal.update as jest.Mock;

describe("Page AI proposals", () => {
  beforeEach(() => jest.clearAllMocks());

  it("never creates a proposal for a private Page", async () => {
    pageFindFirst.mockResolvedValue({
      id: "private-page",
      parentId: null,
      isPrivate: true,
    });

    await expect(
      createAiProposal("user-1", "private-page", {
        summary: "Rewrite the journal",
        operations: [],
      })
    ).rejects.toThrow("Page is private or unavailable");
    expect(proposalCreate).not.toHaveBeenCalled();
  });

  it("stores a pending proposal without applying its operations", async () => {
    pageFindFirst.mockResolvedValue({
      id: "public-page",
      parentId: null,
      isPrivate: false,
    });
    proposalCreate.mockResolvedValue({ id: "proposal-1", status: "PENDING" });

    await createAiProposal("user-1", "public-page", {
      summary: "Summarize this Page",
      operations: [{ type: "append_block", content: { text: "Summary" } }],
    });

    expect(proposalCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pageId: "public-page",
          userId: "user-1",
        }),
      })
    );
  });

  it("rejects a pending proposal without touching page content", async () => {
    proposalFindFirst.mockResolvedValue({ id: "proposal-1" });
    proposalUpdate.mockResolvedValue({ id: "proposal-1", status: "REJECTED" });

    await expect(rejectAiProposal("user-1", "proposal-1")).resolves.toEqual(
      expect.objectContaining({ status: "REJECTED" })
    );
  });
});
