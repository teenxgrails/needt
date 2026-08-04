import fs from "node:fs";
import path from "node:path";

describe("Space task card contract", () => {
  it("uses the shared calendar task-card recipe without a second component", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/tasks/SpaceView.tsx"),
      "utf8"
    );

    expect(source).toContain("var(--calendar-task-bg)");
    expect(source).toContain("var(--calendar-task-border)");
    expect(source).toContain("rounded-[4px]");
    expect(source).toContain("w-1 rounded-l-[4px]");
    expect(source).toContain("group-hover:opacity-[0.15]");
    expect(source).toContain("ring-1 ring-inset ring-[var(--text-secondary)]");
    expect(source).not.toContain("scale-[1.04]");
  });
});
