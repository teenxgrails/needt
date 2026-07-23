import { GET } from "@/app/api/boards/route";

describe("legacy boards API", () => {
  it("preserves data while directing clients to Pages", async () => {
    const response = GET();

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      error:
        "Boards were replaced by Pages. Existing board data is preserved for a future export.",
      replacement: "/pages",
    });
  });
});
