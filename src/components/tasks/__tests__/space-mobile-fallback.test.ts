import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Space mobile fallback", () => {
  const source = readFileSync(
    join(process.cwd(), "src/components/tasks/SpaceView.tsx"),
    "utf8"
  );

  it("keeps mobile users in a functional task view", () => {
    expect(source).toContain('onOpenFallbackView("list")');
    expect(source).toContain('onOpenFallbackView("board")');
    expect(source).not.toContain("show a placeholder and point to desktop");
  });
});
