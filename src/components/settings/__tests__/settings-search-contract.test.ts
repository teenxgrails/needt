import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Settings search contract", () => {
  const source = readFileSync(
    join(process.cwd(), "src/app/(app)/settings/page.tsx"),
    "utf8"
  );

  it("filters settings on both desktop and mobile navigation", () => {
    expect(source).toContain('aria-label="Search settings"');
    expect(source).toContain("filteredTabGroups");
    expect(source).toContain("No settings match");
  });
});
