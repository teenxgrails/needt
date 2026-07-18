import { NextRequest } from "next/server";

import { GET } from "@/app/api/boards/route";
import { listBoards } from "@/services/boards/boardService";

jest.mock("@/lib/auth/api-auth", () => ({
  authenticateRequest: jest.fn().mockResolvedValue({ userId: "user-1" }),
}));

jest.mock("@/services/boards/boardService", () => ({
  createBoard: jest.fn(),
  listBoards: jest.fn(),
}));

describe("boards API error handling", () => {
  it("logs and returns a sane response when the board service fails", async () => {
    jest.mocked(listBoards).mockRejectedValueOnce(new Error("database down"));

    const response = await GET(new NextRequest("http://localhost/api/boards"));

    expect(response).toBeDefined();
    if (!response) throw new Error("Expected a response");
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Could not load boards.",
    });
  });
});
