import fs from "node:fs";
import path from "node:path";

import { shouldAnimateSpaceParticles } from "@/lib/space-particles";

describe("Space particle canvas", () => {
  const particleSource = fs.readFileSync(
    path.join(process.cwd(), "src/components/tasks/SpaceParticles.tsx"),
    "utf8"
  );
  const spaceSource = fs.readFileSync(
    path.join(process.cwd(), "src/components/tasks/SpaceView.tsx"),
    "utf8"
  );
  const styles = fs.readFileSync(
    path.join(process.cwd(), "src/app/globals.css"),
    "utf8"
  );

  it("uses a non-interactive transparent canvas that follows the shared motion policy", () => {
    expect(particleSource).toContain("useNeedtReducedMotion");
    expect(particleSource).toContain('document.addEventListener("visibilitychange"');
    expect(particleSource).toContain("document.hidden");
    expect(particleSource).toContain("window.cancelAnimationFrame");
    expect(particleSource).toContain("pointer-events-none");
    expect(spaceSource).toContain("<SpaceParticles />");
  });

  it("removes the CSS star field and uses contrasting particle colours", () => {
    expect(styles).not.toContain("workspace-space-canvas::before");
    expect(styles).not.toContain("workspace-star-drift");
    expect(styles).toContain("--space-particle: var(--primitive-black)");
    expect(styles).toContain("--space-particle: var(--primitive-white)");
  });

  it("does not start a frame when the document is hidden", () => {
    expect(
      shouldAnimateSpaceParticles({
        documentHidden: true,
        reducedMotion: false,
      })
    ).toBe(false);
    expect(
      shouldAnimateSpaceParticles({
        documentHidden: false,
        reducedMotion: true,
      })
    ).toBe(false);
  });
});
