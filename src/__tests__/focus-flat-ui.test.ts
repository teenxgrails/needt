import { readFileSync } from "fs";
import { join } from "path";

describe("flat Focus composition", () => {
  const source = readFileSync(
    join(process.cwd(), "src/components/focus/FocusTimerPanel.tsx"),
    "utf8"
  );

  it("keeps the Focus canvas free of the retired card selectors", () => {
    expect(source).toContain('data-testid="focus-flat-canvas"');
    expect(source).not.toContain("needt-panel-depth");
    expect(source).not.toContain("rounded-[22px]");
    expect(source).not.toContain("rounded-[18px]");
  });

  it("uses the same control geometry for idle and active sessions", () => {
    expect(source).toContain('aria-label="Focus mode"');
    expect(source).toContain('aria-label="Focus duration in minutes"');
    expect(source).toContain('aria-label={`${Math.round(progress)}');
  });
});
