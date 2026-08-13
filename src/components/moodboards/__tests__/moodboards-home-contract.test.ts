import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Moodboards home contract", () => {
  const source = readFileSync(
    join(process.cwd(), "src/components/moodboards/MoodboardsHome.tsx"),
    "utf8"
  );

  it("offers recent, search and a meaningful empty state", () => {
    expect(source).toContain("Search moodboards");
    expect(source).toContain("Recent");
    expect(source).toContain("Start a visual workspace");
    expect(source).toContain("No moodboards match");
  });
});
