import {
  dragSpring,
  fastFadeTransition,
  instantTransition,
  layoutSpring,
  panelTransition,
  reducedMotionVariants,
  resolveMotionPolicy,
  spatialSpring,
  staggerContainerVariants,
  staggerItemVariants,
} from "@/lib/motion";

describe("motion presets", () => {
  it("keeps interface transitions short and spatial motion spring-based", () => {
    expect(fastFadeTransition.duration).toBeLessThanOrEqual(0.15);
    expect(panelTransition.duration).toBeLessThanOrEqual(0.2);
    expect(instantTransition.duration).toBe(0);
    expect(layoutSpring.type).toBe("spring");
    expect(spatialSpring.type).toBe("spring");
    expect(dragSpring.type).toBe("spring");
    expect(staggerContainerVariants.visible).toBeDefined();
    expect(staggerItemVariants.visible).toBeDefined();
    expect(reducedMotionVariants.hidden).toEqual(
      expect.objectContaining({ opacity: 1, x: 0, y: 0, scale: 1 })
    );
  });
});

describe("motion runtime policy", () => {
  it.each([
    {
      name: "saved preference",
      input: {
        animationsEnabled: false,
        documentVisible: true,
        prefersReducedMotion: false,
      },
    },
    {
      name: "hidden tab",
      input: {
        animationsEnabled: true,
        documentVisible: false,
        prefersReducedMotion: false,
      },
    },
    {
      name: "OS reduced motion",
      input: {
        animationsEnabled: true,
        documentVisible: true,
        prefersReducedMotion: true,
      },
    },
  ])("disables CSS and Motion for $name", ({ input }) => {
    expect(resolveMotionPolicy(input)).toEqual({
      enabled: false,
      datasetValue: "off",
      reducedMotion: "always",
    });
  });

  it("enables motion only when every policy allows it", () => {
    expect(
      resolveMotionPolicy({
        animationsEnabled: true,
        documentVisible: true,
        prefersReducedMotion: false,
      })
    ).toEqual({
      enabled: true,
      datasetValue: "on",
      reducedMotion: "user",
    });
  });
});
